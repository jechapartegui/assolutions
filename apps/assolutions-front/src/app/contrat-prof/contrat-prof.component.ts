import { Component, OnInit } from '@angular/core';
import { ContratProfApiService } from '../../services/contrat-prof-api.service';
import { ProfesseurApiService } from '../../services/professeur-api.service';
import { AppStore } from '../app.store';
import { ContratProf, PersonneLight_VM, Professeur } from '@shared/index';
import { PersonneApiService } from '../../services/personne-api.service';

type ProfesseurWithPersonne = Professeur & {
  person?: PersonneLight_VM;
};

@Component({
  standalone: false,
  selector: 'app-contrat-prof',
  templateUrl: './contrat-prof.component.html',
  styleUrls: ['./contrat-prof.component.css'],
})
export class ContratProfComponent implements OnInit {
  loading = false;
  saving = false;

  contrats: ContratProf[] = [];
  profs: Professeur[] = [];
  personnesById: Record<number, PersonneLight_VM> = {};

  editing: ContratProf | null = null;

  constructor(
    private contratApi: ContratProfApiService,
    private professeurApi: ProfesseurApiService,
    private appStore: AppStore,
    private personneApi: PersonneApiService,
  ) {}

  ngOnInit(): void {
    void this.load();
  }

  get saisonId(): number {
    return Number(
      this.appStore.saison_consultation_id() ??
        this.appStore.saison_active_id(),
    );
  }

  async load(): Promise<void> {
    this.loading = true;

    try {
      const [contrats, profs] = await Promise.all([
        this.contratApi.list(this.saisonId),
        this.professeurApi.list(),
      ]);

      this.contrats = contrats ?? [];
      this.profs = profs ?? [];

      await this.loadPersonnesForProfs();
    } finally {
      this.loading = false;
    }
  }

  private async loadPersonnesForProfs(): Promise<void> {
    const ids = [
      ...new Set(
        this.profs
          .map((prof) => prof.id)
          .filter((id): id is number => Number.isFinite(id) && id > 0),
      ),
    ];
    if (!ids.length) {
      this.personnesById = {};
      return;
    }

    const personnes = await this.personneApi.list_personnelight(ids, false);

    this.personnesById = Object.fromEntries(
      personnes.map((personne) => [personne.id, personne]),
    );
  }

  create(): void {
    this.editing = {
      id: 0,
      professeur_id: null,
      saison_id: this.saisonId,
      type_contrat: '',
      type_remuneration: '0',
      date_debut: '',
      date_fin: '',
      details: '',
    } as ContratProf;
  }

  edit(contrat: ContratProf): void {
    this.editing = {
      ...JSON.parse(JSON.stringify(contrat)),
      date_debut: this.toDateInputValue(contrat.date_debut),
      date_fin: this.toDateInputValue(contrat.date_fin),
    };
  }

  cancel(): void {
    this.editing = null;
  }

  patch(field: keyof ContratProf, value: any): void {
    if (!this.editing) return;

    this.editing = {
      ...this.editing,
      [field]: value,
    };
  }

  canSave(): boolean {
    return (
      !!this.editing &&
      !!this.editing.professeur_id &&
      !!this.editing.saison_id &&
      !!this.editing.type_contrat &&
      !!this.editing.type_remuneration &&
      !!this.editing.date_debut
    );
  }

  async save(): Promise<void> {
    if (!this.canSave() || !this.editing) return;

    this.saving = true;

    try {
      const dto = {
        professeur_id: Number(this.editing.professeur_id),
        saison_id: Number(this.editing.saison_id),
        type_contrat: this.editing.type_contrat,
        type_remuneration: this.editing.type_remuneration,
        date_debut: this.editing.date_debut,
        date_fin: this.editing.date_fin || null,
        details: this.editing.details || null,
      } as any;

      if (this.editing.id > 0) {
        await this.contratApi.update(this.editing.id, dto);
      } else {
        await this.contratApi.create(dto);
      }

      this.editing = null;
      await this.load();
    } finally {
      this.saving = false;
    }
  }

  async remove(contrat: ContratProf): Promise<void> {
    if (!confirm('Supprimer ce contrat professeur ?')) return;

    await this.contratApi.remove(contrat.id);
    await this.load();
  }

  getProfLabel(profId: number): string {
    const prof = this.profs.find((candidate) => candidate.id === profId);
    if (!prof) return `Prof #${profId}`;
    const personne = profId ? this.personnesById[profId] : null;
    return (
      [personne?.prenom, personne?.nom, personne?.surnom]
        .filter(Boolean)
        .join(' ') || `Prof #${profId}`
    );
  }

  formatDateFr(value: Date | string | null | undefined): string {
    if (!value) return '—';

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('fr-FR').format(date);
  }

  toDateInputValue(value: Date | string | null | undefined): string {
    if (!value) return '';

    if (typeof value === 'string') {
      return value.slice(0, 10);
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }

    return '';
  }
}

import { Component, OnInit } from '@angular/core';
import { ContratProf, PersonneLight_VM, Professeur, Saison } from '@shared/index';

import { ContratProfApiService } from '../../services/contrat-prof-api.service';
import { PersonneApiService } from '../../services/personne-api.service';
import { ProfesseurApiService } from '../../services/professeur-api.service';
import { SaisonApiService } from '../../services/saison-api.service';
import { AppStore } from '../app.store';

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
  saisons: Saison[] = [];
  personnesById: Record<number, PersonneLight_VM> = {};
  editing: ContratProf | null = null;

  constructor(
    private readonly contratApi: ContratProfApiService,
    private readonly professeurApi: ProfesseurApiService,
    private readonly appStore: AppStore,
    private readonly personneApi: PersonneApiService,
    private readonly saisonApi: SaisonApiService,
  ) {}

  ngOnInit(): void {
    void this.load();
  }

  get saisonId(): number {
    return Number(
      this.appStore.saison_consultation_id() ?? this.appStore.saison_active_id(),
    );
  }

  async load(): Promise<void> {
    this.loading = true;
    try {
      const [contrats, profs, saisons] = await Promise.all([
        this.contratApi.list(this.saisonId),
        this.professeurApi.list(),
        this.saisonApi.list(),
      ]);
      this.contrats = contrats ?? [];
      this.profs = profs ?? [];
      this.saisons = saisons ?? [];
      await this.loadPersonnesForProfs();
    } finally {
      this.loading = false;
    }
  }

  private async loadPersonnesForProfs(): Promise<void> {
    const ids = [...new Set(this.profs.map((prof) => prof.id).filter((id) => id > 0))];
    if (!ids.length) {
      this.personnesById = {};
      return;
    }
    const personnes = await this.personneApi.list_personnelight(ids, false);
    this.personnesById = Object.fromEntries(personnes.map((personne) => [personne.id, personne]));
  }

  create(): void {
    const saison =
      this.saisons.find((item) => Number(item.id) === this.saisonId) ??
      this.appStore.saison_active();

    this.editing = {
      id: 0,
      professeur_id: null,
      saison_id: this.saisonId,
      type_contrat: '',
      type_remuneration: '0',
      date_debut: this.toDateInputValue(saison?.date_debut),
      date_fin: this.toDateInputValue(saison?.date_fin),
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
    this.editing = { ...this.editing, [field]: value };
  }

  canSave(): boolean {
    return !!(
      this.editing?.professeur_id &&
      this.editing.saison_id &&
      this.editing.type_contrat &&
      this.editing.type_remuneration &&
      this.editing.date_debut &&
      this.editing.date_fin
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
        date_fin: this.editing.date_fin,
        details: this.editing.details || null,
      } as any;

      if (this.editing.id > 0) await this.contratApi.update(this.editing.id, dto);
      else await this.contratApi.create(dto);

      this.editing = null;
      await this.load();
    } finally {
      this.saving = false;
    }
  }

  async remove(contrat: ContratProf): Promise<void> {
    if (!confirm($localize`:@@instructorContract.deleteConfirm:Supprimer ce contrat professeur ?`)) {
      return;
    }
    await this.contratApi.remove(contrat.id);
    await this.load();
  }

  getProfLabel(profId: number): string {
    const personne = this.personnesById[profId];
    return [personne?.prenom, personne?.nom, personne?.surnom].filter(Boolean).join(' ') || `Prof #${profId}`;
  }

  formatDateFr(value: Date | string | null | undefined): string {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime())
      ? '—'
      : new Intl.DateTimeFormat($localize.locale || 'fr-FR').format(date);
  }

  toDateInputValue(value: Date | string | null | undefined): string {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    return value instanceof Date && !Number.isNaN(value.getTime())
      ? value.toISOString().slice(0, 10)
      : '';
  }
}

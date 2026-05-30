import { Component, OnInit } from '@angular/core';
import { ProfesseurApiService } from '../../services/professeur-api.service';
import { ContratProfApiService } from '../../services/contrat-prof-api.service';
import { PersonneApiService } from '../../services/personne-api.service';
import { PersonneLight_VM, Professeur } from '@shared/index';

@Component({
  standalone: false,
  selector: 'app-professeur',
  templateUrl: './professeur.component.html',
  styleUrls: ['../contrat-prof/contrat-prof.component.css'],
})
export class ProfesseurComponent implements OnInit {
  loading = false;
  saving = false;

  profs: Professeur[] = [];
  selectedPersonneId: number | null = null;

  editing: Professeur | null = null;
  contratsExistByProfId: Record<number, boolean> = {};
  personnesById: Record<number, PersonneLight_VM> = {};

  constructor(
    private professeurApi: ProfesseurApiService,
    private contratProfApi: ContratProfApiService,
    private personneApi: PersonneApiService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading = true;

    try {
      this.profs = await this.professeurApi.list() as Professeur[];

      await this.loadPersonnesForProfs();

      const existsRows = await Promise.all(
        this.profs.map(async (prof: Professeur) => ({
          id: prof.id,
          exists: await this.contratProfApi.exist(prof.id),
        })),
      );

      this.contratsExistByProfId = Object.fromEntries(
        existsRows.map(x => [x.id, x.exists]),
      );
    } finally {
      this.loading = false;
    }
  }

  private async loadPersonnesForProfs(): Promise<void> {
    const ids = [
      ...new Set(
        this.profs
          .map(prof => prof.id)
          .filter((id): id is number => Number.isFinite(id) && id > 0),
      ),
    ];

    if (!ids.length) {
      this.personnesById = {};
      return;
    }

    const personnes = await this.personneApi.list_personnelight(ids, false);

    this.personnesById = Object.fromEntries(
      personnes.map(p => [p.id, p]),
    );
  }


  getLibelle(prof: Professeur): string {
    const personneId = prof.id;
    const personne = personneId ? this.personnesById[personneId] : null;

    return (
      [personne?.prenom, personne?.nom, personne?.surnom].filter(Boolean).join(' ') ||
      `Professeur #${prof.id}`
    );
  }

  canDelete(prof: Professeur): boolean {
    return !this.contratsExistByProfId[prof.id];
  }

  async addProfesseur(): Promise<void> {
    if (!this.selectedPersonneId) return;

    this.saving = true;

    try {
      await this.professeurApi.create({
        personne_id: this.selectedPersonneId,
      } as any);

      this.selectedPersonneId = null;
      await this.load();
    } finally {
      this.saving = false;
    }
  }

  edit(prof: Professeur): void {
    this.editing = JSON.parse(JSON.stringify(prof)) as Professeur;
  }

  cancel(): void {
    this.editing = null;
  }

  patch(field: keyof Professeur, value: any): void {
    if (!this.editing) return;

    this.editing = {
      ...this.editing,
      [field]: value,
    };
  }

  async save(): Promise<void> {
    if (!this.editing) return;

    this.saving = true;

    try {
      await this.professeurApi.update(this.editing.id, {
        taux: this.editing.hourly_rate,
        statut: this.editing.status,
        num_tva: this.editing.num_tva,
        num_siren: this.editing.num_siren,
        iban: this.editing.iban,
        info: this.editing.info,
      } as any);

      this.editing = null;
      await this.load();
    } finally {
      this.saving = false;
    }
  }

  async remove(prof: Professeur): Promise<void> {
    if (!this.canDelete(prof)) {
      alert('Impossible de supprimer ce professeur : il possède au moins un contrat.');
      return;
    }

    if (!confirm(`Supprimer ${this.getLibelle(prof)} des professeurs ?`)) return;

    await this.professeurApi.remove(prof.id);
    await this.load();
  }
}
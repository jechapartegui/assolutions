import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ExigenceDossier,
  ExigenceDossierPortee,
  ExigencePorteeType,
  Groupe,
  SaveExigenceDossierDto,
  TarifInscription,
} from '@shared/index';

import { ApiClientService } from '../../services/api-client.service';
import { ErrorService } from '../../services/error.service';
import { ExigenceDossierApiService } from '../../services/exigence-dossier-api.service';
import { TarifInscriptionApiService } from '../../services/tarif-inscription-api.service';
import { AppStore } from '../app.store';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-exigence-dossier',
  templateUrl: './exigence-dossier.component.html',
  styleUrls: ['./exigence-dossier.component.css'],
})
export class ExigenceDossierComponent implements OnInit {
  exigences: ExigenceDossier[] = [];
  groupes: Groupe[] = [];
  tarifs: TarifInscription[] = [];
  edit: ExigenceDossier | null = null;
  loading = false;
  filterUsage: 'TOUS' | 'INSCRIPTION' | 'LICENCE' = 'TOUS';

  readonly personFields = [
    { code: 'FIRST_NAME', label: 'Prénom' },
    { code: 'LAST_NAME', label: 'Nom' },
    { code: 'DATE_NAISSANCE', label: 'Date de naissance' },
    { code: 'ADDRESS', label: 'Adresse' },
    { code: 'PAYS', label: 'Pays' },
  ];
  readonly contactTypes = [
    { code: 'EMAIL', label: 'Email' },
    { code: 'PHONE', label: 'Téléphone' },
    { code: 'URGENCE', label: "Contact d'urgence" },
  ];
  readonly documentTypes = [
    { code: 'PHOTO', label: 'Photo' },
    { code: 'CERTIFICAT_MEDICAL', label: 'Certificat médical' },
    { code: 'QS_SPORT', label: 'Questionnaire de santé' },
    { code: 'AUTORISATION_PARENTALE', label: 'Autorisation parentale' },
  ];

  constructor(
    private readonly api: ExigenceDossierApiService,
    private readonly rawApi: ApiClientService,
    private readonly tarifApi: TarifInscriptionApiService,
    public readonly store: AppStore,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  get saisonId(): number {
    const stored = Number(localStorage.getItem('assolutions.consultationSaisonId'));
    return Number.isInteger(stored) && stored > 0
      ? stored
      : Number(this.store.saison_active_id());
  }

  get visibleRequirements(): ExigenceDossier[] {
    return this.exigences.filter(
      (item) => this.filterUsage === 'TOUS' || item.usage === this.filterUsage,
    );
  }

  startCreate(): void {
    this.edit = {
      id: 0,
      project_id: Number(this.store.selectedProjectId()),
      saison_id: this.saisonId,
      code: '',
      libelle: '',
      description: null,
      usage: 'INSCRIPTION',
      type_exigence: 'CHAMP_PERSONNE',
      source_code: 'FIRST_NAME',
      type_reponse: 'AUCUNE',
      obligatoire: true,
      bloquante: true,
      age_min: null,
      age_max: null,
      validite_mois: null,
      texte_consentement: null,
      version_texte: null,
      ordre: this.exigences.length + 1,
      actif: true,
      portees: [this.newScope('GENERAL')],
    };
  }

  startEdit(item: ExigenceDossier): void {
    this.edit = {
      ...item,
      portees: item.portees.map((scope) => ({ ...scope })),
    };
  }

  onTypeChange(): void {
    if (!this.edit) return;
    const item = this.edit;
    if (item.type_exigence === 'CHAMP_PERSONNE') {
      item.source_code = this.personFields[0].code;
      item.type_reponse = 'AUCUNE';
    } else if (item.type_exigence === 'CONTACT') {
      item.source_code = this.contactTypes[0].code;
      item.type_reponse = 'AUCUNE';
    } else if (item.type_exigence === 'DOCUMENT') {
      item.source_code = this.documentTypes[0].code;
      item.type_reponse = 'DOCUMENT';
    } else if (item.type_exigence === 'PREUVE_MEDICALE') {
      item.usage = 'LICENCE';
      item.source_code = null;
      item.type_reponse = 'AUCUNE';
      item.obligatoire = true;
      item.bloquante = false;
      item.validite_mois = null;
      item.portees = [
        {
          type_portee: 'TYPE_LICENCE',
          cible_id: null,
          cible_code: 'COMPETITION',
        },
      ];
    } else if (item.type_exigence === 'CONSENTEMENT') {
      item.source_code = null;
      item.type_reponse = 'BOOLEEN';
    } else {
      item.source_code = null;
      item.type_reponse = 'TEXTE';
    }
  }

  addScope(type: ExigencePorteeType = 'GENERAL'): void {
    if (!this.edit) return;
    if (type === 'GENERAL') this.edit.portees = [];
    else {
      this.edit.portees = this.edit.portees.filter(
        (scope) => scope.type_portee !== 'GENERAL',
      );
    }
    this.edit.portees.push(this.newScope(type));
  }

  changeScope(scope: ExigenceDossierPortee): void {
    scope.cible_id = null;
    scope.cible_code = null;
    if (scope.type_portee === 'GENERAL' && this.edit) {
      this.edit.portees = [scope];
    }
  }

  removeScope(index: number): void {
    this.edit?.portees.splice(index, 1);
  }

  scopeLabel(scope: ExigenceDossierPortee): string {
    if (scope.type_portee === 'GENERAL') return 'Tous les dossiers';
    if (scope.type_portee === 'GROUPE') {
      return `Groupe : ${
        this.groupes.find((item) => item.id === scope.cible_id)?.nom ??
        '#' + scope.cible_id
      }`;
    }
    if (scope.type_portee === 'TARIF') {
      return `Tarif : ${
        this.tarifs.find((item) => item.id === scope.cible_id)?.nom ??
        '#' + scope.cible_id
      }`;
    }
    return `Licence : ${scope.cible_code || 'à préciser'}`;
  }

  async save(): Promise<void> {
    if (!this.edit) return;
    const dto = this.toDto(this.edit);
    await this.run('Sauvegarde de l’exigence', async () => {
      if (this.edit!.id) await this.api.update(this.edit!.id, dto);
      else await this.api.create(dto);
      this.edit = null;
      await this.loadData();
    });
  }

  async remove(item: ExigenceDossier): Promise<void> {
    if (!window.confirm(`Supprimer l’exigence « ${item.libelle} » ?`)) return;
    await this.run('Suppression de l’exigence', async () => {
      await this.api.remove(item.id);
      if (this.edit?.id === item.id) this.edit = null;
      await this.loadData();
    });
  }

  private async load(): Promise<void> {
    await this.run('Chargement des exigences', () => this.loadData());
  }

  private async loadData(): Promise<void> {
    [this.exigences, this.groupes, this.tarifs] = await Promise.all([
      this.api.list(this.saisonId),
      this.rawApi.GET<Groupe[]>(`/groupes/saison/${this.saisonId}`),
      this.tarifApi.list(this.saisonId),
    ]);
  }

  private newScope(type: ExigencePorteeType): ExigenceDossierPortee {
    return {
      type_portee: type,
      cible_id: null,
      cible_code: null,
    };
  }

  private toDto(item: ExigenceDossier): SaveExigenceDossierDto {
    return {
      saison_id: item.saison_id,
      code: item.code.trim().toUpperCase(),
      libelle: item.libelle.trim(),
      description: item.description?.trim() || null,
      usage: item.usage,
      type_exigence: item.type_exigence,
      source_code: item.source_code?.trim().toUpperCase() || null,
      type_reponse: item.type_reponse,
      obligatoire: !!item.obligatoire,
      bloquante: !!item.bloquante,
      age_min: item.age_min ?? null,
      age_max: item.age_max ?? null,
      validite_mois: item.validite_mois ?? null,
      texte_consentement: item.texte_consentement?.trim() || null,
      version_texte: item.version_texte?.trim() || null,
      ordre: Number(item.ordre || 0),
      actif: !!item.actif,
      portees: item.portees.map((scope) => ({
        type_portee: scope.type_portee,
        cible_id: scope.cible_id ?? null,
        cible_code: scope.cible_code?.trim().toUpperCase() || null,
      })),
    };
  }

  private errorMessage(error: any): string {
    const value =
      error?.error?.message ?? error?.message ?? 'Une erreur est survenue';
    return Array.isArray(value) ? value.join(' · ') : String(value);
  }

  private async run(label: string, action: () => Promise<void>): Promise<void> {
    this.loading = true;
    try {
      await action();
    } catch (error) {
      ErrorService.instance.emitChange(
        ErrorService.instance.CreateError(label, this.errorMessage(error)),
      );
    } finally {
      this.loading = false;
    }
  }
}

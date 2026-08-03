import {
  AddInfo,
  AddInfoEditorItem_VM,
  PreuveMedicale,
  SavePreuveMedicaleDto,
} from '@shared/index';
import { Component, Input, OnChanges, OnInit } from '@angular/core';

import { AddInfoApiService } from '../../services/addinfo-api.service';
import { DossierPersonneApiService } from '../../services/dossier-personne-api.service';
import { ErrorService } from '../../services/error.service';
import { AppStore } from '../app.store';

@Component({
  selector: 'app-add-info-editor',
  templateUrl: './add-info-editor.component.html',
  styleUrls: ['./add-info-editor.component.css'],
  standalone: false,
})
export class AddInfoEditorComponent implements OnInit, OnChanges {
  @Input() objectType!: string;
  @Input() objectId!: number;

  items: AddInfoEditorItem_VM[] = [];
  fields: AddInfo[] = [];
  values: AddInfo[] = [];
  selectedFieldId = 0;

  medicalProofs: PreuveMedicale[] = [];
  medicalLoading = false;
  medicalType: 'QS_SPORT' | 'CERTIFICAT' = 'QS_SPORT';
  medicalDate = new Date().toISOString().slice(0, 10);
  medicalQsNegative = true;
  medicalDoctorName = '';
  medicalRpps = '';
  medicalCompetition = true;
  medicalComment = '';

  constructor(
    private readonly addInfoApi: AddInfoApiService,
    private readonly dossierApi: DossierPersonneApiService,
    private readonly appStore: AppStore,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  async ngOnChanges(): Promise<void> {
    if (this.objectType && this.objectId !== undefined) {
      await this.loadAll();
    }
  }

  get availableFields(): AddInfo[] {
    const usedFieldIds = new Set(this.items.map((x) => x.fieldId));
    return this.fields.filter((field) => !usedFieldIds.has(field.id));
  }

  get showMedicalSection(): boolean {
    return (
      this.objectType?.trim().toUpperCase() === 'PERSONNE' &&
      Number(this.objectId) > 0 &&
      this.seasonId > 0
    );
  }

  get seasonId(): number {
    return Number(this.appStore.saison_active_id() ?? 0);
  }

  async load(): Promise<void> {
    if (!this.objectType || this.objectId === undefined || this.objectId === null) {
      return;
    }

    const [fields, values] = await Promise.all([
      this.addInfoApi.listFields(this.objectType),
      this.objectId > 0
        ? this.addInfoApi.listValues(this.objectType, this.objectId)
        : Promise.resolve([]),
    ]);

    this.fields = fields ?? [];
    this.values = values ?? [];

    this.items = this.values
      .map((value) => {
        const field = this.fields.find(
          (candidate) => String(candidate.id) === value.value_type,
        );
        if (!field) return null;
        return this.toVm(field, value);
      })
      .filter((item): item is AddInfoEditorItem_VM => !!item);
  }

  async loadMedicalProofs(): Promise<void> {
    if (!this.showMedicalSection) {
      this.medicalProofs = [];
      return;
    }

    this.medicalLoading = true;
    try {
      this.medicalProofs = await this.dossierApi.listMedicalProofs(
        Number(this.objectId),
        this.seasonId,
      );
    } catch (error) {
      this.emitError('Charger la situation médicale', error);
    } finally {
      this.medicalLoading = false;
    }
  }

  toVm(field: AddInfo, value?: AddInfo | null): AddInfoEditorItem_VM {
    return {
      fieldId: field.id,
      valueId: value?.id ?? 0,
      label: field.text,
      fieldType: field.value_type,
      value: value?.text ?? '',
      initialValue: value?.text ?? '',
      selected: true,
      initiallySelected: !!value,
      boolValue: (value?.text ?? '') === 'true',
      options: this.extractOptions(field.value_type),
    };
  }

  addSelectedField(): void {
    const field = this.fields.find((candidate) => candidate.id === this.selectedFieldId);
    if (!field) return;

    this.items.push(this.toVm(field, null));
    this.selectedFieldId = 0;
  }

  removeItem(item: AddInfoEditorItem_VM): void {
    this.items = this.items.filter((candidate) => candidate !== item);
  }

  getFieldKind(valueType: string): string {
    if (!valueType) return 'string';
    if (valueType.startsWith('select:')) return 'select';
    if (valueType.startsWith('select[')) return 'select';
    return valueType;
  }

  extractOptions(valueType: string): string[] {
    if (!valueType?.startsWith('select:')) return [];

    const raw = valueType.substring('select:'.length);
    if (raw.startsWith('[')) {
      try {
        return JSON.parse(raw);
      } catch {
        return [];
      }
    }

    return [];
  }

  normalizeValue(item: AddInfoEditorItem_VM): string {
    if (this.getFieldKind(item.fieldType) === 'boolean') {
      return item.boolValue ? 'true' : 'false';
    }
    return item.value ?? '';
  }

  proofLabel(proof: PreuveMedicale): string {
    if (proof.type_preuve === 'QS_SPORT') {
      return proof.qs_reponses_negatives
        ? 'QS Sport : toutes les réponses négatives'
        : 'QS Sport : au moins une réponse positive';
    }

    const competition = proof.valable_competition
      ? ' · compétition'
      : '';
    return `Certificat médical${competition}`;
  }

  async saveMedicalProof(): Promise<void> {
    if (!this.showMedicalSection || !this.medicalDate) return;

    const dto: SavePreuveMedicaleDto = {
      personne_id: Number(this.objectId),
      saison_id: this.seasonId,
      type_preuve: this.medicalType,
      date_document: this.medicalDate,
      qs_reponses_negatives:
        this.medicalType === 'QS_SPORT' ? this.medicalQsNegative : null,
      valable_competition:
        this.medicalType === 'CERTIFICAT' && this.medicalCompetition,
      medecin_nom:
        this.medicalType === 'CERTIFICAT'
          ? this.medicalDoctorName.trim()
          : null,
      medecin_rpps:
        this.medicalType === 'CERTIFICAT' ? this.medicalRpps.trim() : null,
      document_id: null,
      commentaire: this.medicalComment.trim() || null,
    };

    this.medicalLoading = true;
    try {
      await this.dossierApi.saveMedicalProof(dto);
      this.resetMedicalForm();
      await this.loadMedicalProofs();
    } catch (error) {
      this.emitError('Enregistrer la situation médicale', error);
    } finally {
      this.medicalLoading = false;
    }
  }

  async save(): Promise<void> {
    if (!this.objectType || !this.objectId || this.objectId <= 0) return;

    const currentFieldIds = new Set(this.items.map((item) => item.fieldId));
    const deleted = this.values.filter(
      (value) => !currentFieldIds.has(Number(value.value_type)),
    );
    const existingToUpdate = this.items.filter(
      (item) =>
        item.valueId > 0 && this.normalizeValue(item) !== item.initialValue,
    );
    const created = this.items.filter((item) => item.valueId === 0);

    await Promise.all([
      ...deleted.map((value) => this.addInfoApi.deleteValue(value.id)),
      ...existingToUpdate.map((item) =>
        this.addInfoApi.updateValue(item.valueId, {
          text: this.normalizeValue(item),
        }),
      ),
      ...created.map((item) =>
        this.addInfoApi.createValue({
          object_type: this.objectType,
          object_id: this.objectId,
          field_id: item.fieldId,
          text: this.normalizeValue(item),
        }),
      ),
    ]);

    await this.load();
  }

  private async loadAll(): Promise<void> {
    await Promise.all([this.load(), this.loadMedicalProofs()]);
  }

  private resetMedicalForm(): void {
    this.medicalType = 'QS_SPORT';
    this.medicalDate = new Date().toISOString().slice(0, 10);
    this.medicalQsNegative = true;
    this.medicalDoctorName = '';
    this.medicalRpps = '';
    this.medicalCompetition = true;
    this.medicalComment = '';
  }

  private emitError(title: string, error: any): void {
    const value =
      error?.error?.message ?? error?.message ?? 'Une erreur est survenue';
    ErrorService.instance.emitChange(
      ErrorService.instance.CreateError(
        title,
        Array.isArray(value) ? value.join(' · ') : String(value),
      ),
    );
  }
}

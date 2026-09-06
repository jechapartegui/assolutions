import { AddInfo, AddInfoEditorItem_VM } from '@shared/index';
import { Component, Input, OnChanges, OnInit } from '@angular/core';

import { AddInfoApiService } from '../../services/addinfo-api.service';
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

  constructor(
    private readonly addInfoApi: AddInfoApiService,
    public readonly appStore: AppStore,
  ) {}

  get activeSeasonId(): number {
    return Number(this.appStore.saison_active_id() ?? 0);
  }

  get showMedicalSection(): boolean {
    return (
      this.effectiveObjectType.toUpperCase() === 'PERSONNE' &&
      Number(this.objectId) > 0 &&
      this.activeSeasonId > 0
    );
  }

  private get effectiveObjectType(): string {
    return String(this.objectType ?? '').trim();
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async ngOnChanges(): Promise<void> {
    if (this.objectType && this.objectId !== undefined) await this.load();
  }

  async load(): Promise<void> {
    if (!this.effectiveObjectType || this.objectId === undefined || this.objectId === null) {
      return;
    }

    const [fields, values] = await Promise.all([
      this.addInfoApi.listFields(this.effectiveObjectType),
      this.objectId > 0
        ? this.addInfoApi.listValues(this.effectiveObjectType, this.objectId)
        : Promise.resolve([]),
    ]);

    this.fields = fields ?? [];
    this.values = values ?? [];

    // Les définitions pilotent directement le formulaire : un écran métier fournit
    // seulement objectType/objectId et tous les champs configurés apparaissent.
    this.items = this.fields.map((field) => {
      const value = this.values.find(
        (candidate) => String(candidate.value_type) === String(field.id),
      );
      return this.toVm(field, value ?? null);
    });
  }

  toVm(field: AddInfo, value?: AddInfo | null): AddInfoEditorItem_VM {
    const currentValue = value?.text ?? '';
    const options = this.extractOptions(field.value_type);

    // Une option retirée de la configuration reste affichable pour les objets
    // qui l'utilisaient déjà. Elle n'est simplement plus proposée aux nouveaux.
    if (
      this.getFieldKind(field.value_type) === 'select' &&
      currentValue &&
      !options.includes(currentValue)
    ) {
      options.push(currentValue);
    }

    return {
      fieldId: field.id,
      valueId: value?.id ?? 0,
      label: field.text,
      fieldType: field.value_type,
      value: currentValue,
      initialValue: currentValue,
      selected: true,
      initiallySelected: !!value,
      boolValue: currentValue === 'true',
      options,
    };
  }

  getFieldKind(valueType: string): string {
    if (!valueType) return 'string';
    if (valueType.startsWith('select:') || valueType.startsWith('select[')) {
      return 'select';
    }
    return valueType;
  }

  extractOptions(valueType: string): string[] {
    const source = String(valueType ?? '');
    let raw = '';

    if (source.startsWith('select:')) {
      raw = source.substring('select:'.length);
    } else if (source.startsWith('select[')) {
      raw = source.substring('select'.length);
    } else {
      return [];
    }

    if (!raw.startsWith('[')) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map((option) => String(option).trim()).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  }

  normalizeValue(item: AddInfoEditorItem_VM): string {
    if (this.getFieldKind(item.fieldType) === 'boolean') {
      return item.boolValue ? 'true' : 'false';
    }
    return String(item.value ?? '').trim();
  }

  async save(): Promise<void> {
    if (!this.effectiveObjectType || !this.objectId || this.objectId <= 0) return;

    const changedExisting = this.items.filter(
      (item) =>
        item.valueId > 0 && this.normalizeValue(item) !== item.initialValue,
    );
    const created = this.items.filter(
      (item) => item.valueId === 0 && this.shouldPersistNewValue(item),
    );

    await Promise.all([
      ...changedExisting.map((item) => {
        const text = this.normalizeValue(item);
        return text === ''
          ? this.addInfoApi.deleteValue(item.valueId)
          : this.addInfoApi.updateValue(item.valueId, { text });
      }),
      ...created.map((item) =>
        this.addInfoApi.createValue({
          object_type: this.effectiveObjectType,
          object_id: this.objectId,
          field_id: item.fieldId,
          text: this.normalizeValue(item),
        }),
      ),
    ]);

    await this.load();
  }

  private shouldPersistNewValue(item: AddInfoEditorItem_VM): boolean {
    const kind = this.getFieldKind(item.fieldType);
    if (kind === 'boolean') return item.boolValue === true;
    return this.normalizeValue(item) !== '';
  }
}

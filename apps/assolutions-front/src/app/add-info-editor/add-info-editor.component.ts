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
  selectedFieldId = 0;

  constructor(
    private readonly addInfoApi: AddInfoApiService,
    public readonly appStore: AppStore,
  ) {}

  get activeSeasonId(): number {
    return Number(this.appStore.saison_active_id() ?? 0);
  }

  get showMedicalSection(): boolean {
    return (
      this.objectType?.trim().toUpperCase() === 'PERSONNE' &&
      Number(this.objectId) > 0 &&
      this.activeSeasonId > 0
    );
  }

  async ngOnInit(): Promise<void> { await this.load(); }

  async ngOnChanges(): Promise<void> {
    if (this.objectType && this.objectId !== undefined) await this.load();
  }

  get availableFields(): AddInfo[] {
    const usedFieldIds = new Set(this.items.map((item) => item.fieldId));
    return this.fields.filter((field) => !usedFieldIds.has(field.id));
  }

  async load(): Promise<void> {
    if (!this.objectType || this.objectId === undefined || this.objectId === null) return;
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
        const field = this.fields.find((candidate) => String(candidate.id) === value.value_type);
        return field ? this.toVm(field, value) : null;
      })
      .filter((item): item is AddInfoEditorItem_VM => !!item);
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
    if (valueType.startsWith('select:') || valueType.startsWith('select[')) return 'select';
    return valueType;
  }

  extractOptions(valueType: string): string[] {
    if (!valueType?.startsWith('select:')) return [];
    const raw = valueType.substring('select:'.length);
    if (raw.startsWith('[')) {
      try { return JSON.parse(raw); } catch { return []; }
    }
    return [];
  }

  normalizeValue(item: AddInfoEditorItem_VM): string {
    if (this.getFieldKind(item.fieldType) === 'boolean') {
      return item.boolValue ? 'true' : 'false';
    }
    return item.value ?? '';
  }

  async save(): Promise<void> {
    if (!this.objectType || !this.objectId || this.objectId <= 0) return;
    const currentFieldIds = new Set(this.items.map((item) => item.fieldId));
    const deleted = this.values.filter(
      (value) => !currentFieldIds.has(Number(value.value_type)),
    );
    const existingToUpdate = this.items.filter(
      (item) => item.valueId > 0 && this.normalizeValue(item) !== item.initialValue,
    );
    const created = this.items.filter((item) => item.valueId === 0);
    await Promise.all([
      ...deleted.map((value) => this.addInfoApi.deleteValue(value.id)),
      ...existingToUpdate.map((item) =>
        this.addInfoApi.updateValue(item.valueId, { text: this.normalizeValue(item) }),
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
}

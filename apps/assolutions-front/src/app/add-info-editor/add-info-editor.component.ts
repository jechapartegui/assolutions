import { AddInfo, AddInfoEditorItem_VM } from "@shared/index";
import { AddInfoApiService } from "../../services/addinfo-api.service";
import { Component, Input, OnChanges, OnInit } from "@angular/core";

@Component({
  selector: 'app-add-info-editor',
  templateUrl: './add-info-editor.component.html',
  styleUrls: ['./add-info-editor.component.css'],
  standalone: false
})
export class AddInfoEditorComponent implements OnInit, OnChanges {
  @Input() objectType!: string;
  @Input() objectId!: number;

  items: AddInfoEditorItem_VM[] = [];
  fields: AddInfo[] = [];
  values: AddInfo[] = [];
  selectedFieldId = 0;

  constructor(private addInfoApi: AddInfoApiService) {}

  async ngOnInit() {
    await this.load();
  }

  async ngOnChanges() {
    if (this.objectType && this.objectId !== undefined) {
      await this.load();
    }
  }

  get availableFields(): AddInfo[] {
    const usedFieldIds = new Set(this.items.map(x => x.fieldId));
    return this.fields.filter(f => !usedFieldIds.has(f.id));
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
      .map(value => {
        const field = this.fields.find(f => String(f.id) === value.value_type);
        if (!field) return null;

        return this.toVm(field, value);
      })
      .filter((x): x is AddInfoEditorItem_VM => !!x);
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
    const field = this.fields.find(f => f.id === this.selectedFieldId);
    if (!field) return;

    this.items.push(this.toVm(field, null));
    this.selectedFieldId = 0;
  }

  removeItem(item: AddInfoEditorItem_VM): void {
    this.items = this.items.filter(x => x !== item);
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

    // Pour LV_xxx : à brancher ensuite sur getLov()
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

    const currentFieldIds = new Set(this.items.map(x => x.fieldId));

    const deleted = this.values.filter(v => !currentFieldIds.has(Number(v.value_type)));

    const existingToUpdate = this.items.filter(x =>
      x.valueId > 0 && this.normalizeValue(x) !== x.initialValue
    );

    const created = this.items.filter(x => x.valueId === 0);

    await Promise.all([
      ...deleted.map(v => this.addInfoApi.deleteValue(v.id)),
      ...existingToUpdate.map(x =>
        this.addInfoApi.updateValue(x.valueId, {
          text: this.normalizeValue(x),
        })
      ),
      ...created.map(x =>
        this.addInfoApi.createValue({
          object_type: this.objectType,
          object_id: this.objectId,
          field_id: x.fieldId,
          text: this.normalizeValue(x),
        })
      ),
    ]);

    await this.load();
  }
}
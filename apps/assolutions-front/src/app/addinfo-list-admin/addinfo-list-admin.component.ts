import { Component, OnInit } from '@angular/core';
import {
  AddInfoAdminFieldVm,
  AddInfoApiService,
  AddInfoFieldKind,
  AddInfoListFieldVm,
} from '../../services/addinfo-api.service';
import { AppStore } from '../app.store';

type EditableListField = AddInfoListFieldVm & {
  draftOptions: string[];
  newOption: string;
  saving: boolean;
  error: string;
  success: string;
};

type FieldForm = {
  id: number;
  label: string;
  kind: AddInfoFieldKind;
  usageCount: number;
};

@Component({
  selector: 'app-addinfo-list-admin',
  templateUrl: './addinfo-list-admin.component.html',
  styleUrls: ['./addinfo-list-admin.component.css'],
  standalone: false,
})
export class AddinfoListAdminComponent implements OnInit {
  readonly objectType = 'PERSONNE';
  readonly fieldKinds: Array<{ value: AddInfoFieldKind; label: string }> = [
    { value: 'string', label: 'Texte' },
    { value: 'number', label: 'Nombre' },
    { value: 'boolean', label: 'Oui / Non' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Liste' },
    { value: 'textarea', label: 'Texte long' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Téléphone' },
    { value: 'url', label: 'Lien / URL' },
  ];

  fields: AddInfoAdminFieldVm[] = [];
  items: EditableListField[] = [];
  loading = false;
  loadError = '';

  fieldFormOpen = false;
  fieldFormSaving = false;
  fieldFormError = '';
  fieldForm: FieldForm = this.emptyFieldForm();
  fieldActionError = '';
  fieldActionSuccess = '';

  constructor(
    private readonly addInfoApi: AddInfoApiService,
    public readonly store: AppStore,
  ) {}

  ngOnInit(): void {
    this.store.updateSelectedMenu('ADDINFO');
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.loadError = '';

    try {
      const [fields, listFields] = await Promise.all([
        this.addInfoApi.listAdminFields(this.objectType),
        this.addInfoApi.listSelectableFields(),
      ]);
      this.fields = fields ?? [];
      this.items = (listFields ?? [])
        .filter((item) => item.field.object_type === this.objectType)
        .map((item) => this.toEditable(item));
    } catch (error) {
      console.error('Chargement des champs addinfo impossible', error);
      this.loadError =
        'Impossible de charger les champs complémentaires. Réessaie dans quelques instants.';
    } finally {
      this.loading = false;
    }
  }

  openCreateField(): void {
    this.fieldForm = this.emptyFieldForm();
    this.fieldFormError = '';
    this.fieldActionError = '';
    this.fieldActionSuccess = '';
    this.fieldFormOpen = true;
  }

  openEditField(item: AddInfoAdminFieldVm): void {
    this.fieldForm = {
      id: item.field.id,
      label: item.field.text,
      kind: item.kind,
      usageCount: Number(item.usageCount ?? 0),
    };
    this.fieldFormError = '';
    this.fieldActionError = '';
    this.fieldActionSuccess = '';
    this.fieldFormOpen = true;
  }

  closeFieldForm(): void {
    if (this.fieldFormSaving) return;
    this.fieldFormOpen = false;
    this.fieldFormError = '';
  }

  async saveField(): Promise<void> {
    const label = String(this.fieldForm.label ?? '').trim();
    this.fieldFormError = '';
    this.fieldActionError = '';
    this.fieldActionSuccess = '';

    if (!label) {
      this.fieldFormError = 'Le libellé est obligatoire.';
      return;
    }

    this.fieldFormSaving = true;
    try {
      if (this.fieldForm.id > 0) {
        await this.addInfoApi.updateAdminField(this.fieldForm.id, {
          label,
          kind: this.fieldForm.kind,
        });
        this.fieldActionSuccess = `Le champ « ${label} » a été modifié.`;
      } else {
        await this.addInfoApi.createAdminField({
          object_type: this.objectType,
          label,
          kind: this.fieldForm.kind,
          options: this.fieldForm.kind === 'select' ? [] : undefined,
        });
        this.fieldActionSuccess = `Le champ « ${label} » a été créé.`;
      }

      this.fieldFormOpen = false;
      await this.load();
    } catch (error: any) {
      console.error('Enregistrement du champ addinfo impossible', error);
      this.fieldFormError =
        error?.error?.message || error?.message || 'Impossible d’enregistrer ce champ.';
    } finally {
      this.fieldFormSaving = false;
    }
  }

  async deleteField(item: AddInfoAdminFieldVm): Promise<void> {
    this.fieldActionError = '';
    this.fieldActionSuccess = '';

    if (Number(item.usageCount ?? 0) > 0) {
      this.fieldActionError =
        `Le champ « ${item.field.text} » possède ${item.usageCount} réponse(s) et ne peut pas être supprimé.`;
      return;
    }

    if (!window.confirm(`Supprimer le champ « ${item.field.text} » ?`)) return;

    try {
      await this.addInfoApi.deleteAdminField(item.field.id);
      this.fieldActionSuccess = `Le champ « ${item.field.text} » a été supprimé.`;
      await this.load();
    } catch (error: any) {
      console.error('Suppression du champ addinfo impossible', error);
      this.fieldActionError =
        error?.error?.message || error?.message || 'Impossible de supprimer ce champ.';
    }
  }

  kindLabel(kind: AddInfoFieldKind): string {
    return this.fieldKinds.find((item) => item.value === kind)?.label ?? kind;
  }

  addOption(item: EditableListField): void {
    const value = String(item.newOption ?? '').trim();
    item.error = '';
    item.success = '';

    if (!value) return;

    if (
      item.draftOptions.some(
        (option) => option.toLocaleLowerCase('fr') === value.toLocaleLowerCase('fr'),
      )
    ) {
      item.error = `La valeur « ${value} » existe déjà dans cette liste.`;
      return;
    }

    item.draftOptions.push(value);
    item.newOption = '';
  }

  removeOption(item: EditableListField, index: number): void {
    const option = item.draftOptions[index];
    if (option == null) return;

    const usage = this.usageCount(item, option);
    if (
      usage > 0 &&
      !window.confirm(
        `« ${option} » est actuellement utilisée ${usage} fois. Elle ne sera plus proposée, mais les réponses existantes seront conservées. Continuer ?`,
      )
    ) {
      return;
    }

    item.draftOptions.splice(index, 1);
    item.error = '';
    item.success = '';
  }

  moveOption(item: EditableListField, index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= item.draftOptions.length) return;

    const [option] = item.draftOptions.splice(index, 1);
    item.draftOptions.splice(target, 0, option);
    item.error = '';
    item.success = '';
  }

  usageCount(item: EditableListField, option: string): number {
    return Number(item.usage?.[option] ?? 0);
  }

  historicalValues(item: EditableListField): Array<{ value: string; count: number }> {
    const active = new Set(item.options);
    return Object.entries(item.usage ?? {})
      .filter(([value, count]) => Number(count) > 0 && !active.has(value))
      .map(([value, count]) => ({ value, count: Number(count) }))
      .sort((a, b) => a.value.localeCompare(b.value, 'fr'));
  }

  serializedLength(item: EditableListField): number {
    return `select:${JSON.stringify(this.normalizedDraft(item))}`.length;
  }

  isTooLong(item: EditableListField): boolean {
    return this.serializedLength(item) > 50;
  }

  isDirty(item: EditableListField): boolean {
    return JSON.stringify(this.normalizedDraft(item)) !== JSON.stringify(item.options);
  }

  async save(item: EditableListField): Promise<void> {
    item.error = '';
    item.success = '';

    const options = this.normalizedDraft(item);
    const duplicate = this.findDuplicate(options);
    if (duplicate) {
      item.error = `La valeur « ${duplicate} » est présente plusieurs fois.`;
      return;
    }

    if (`select:${JSON.stringify(options)}`.length > 50) {
      item.error =
        'Cette liste dépasse la capacité du modèle addinfo actuel (50 caractères pour sa configuration).';
      return;
    }

    item.saving = true;
    try {
      const saved = await this.addInfoApi.updateSelectableFieldOptions(
        item.field.id,
        options,
      );
      item.field = saved.field;
      item.options = [...saved.options];
      item.draftOptions = [...saved.options];
      item.usage = { ...(saved.usage ?? {}) };
      item.success = 'Liste enregistrée.';
      await this.refreshFieldMetadata();
    } catch (error: any) {
      console.error('Enregistrement de la liste addinfo impossible', error);
      item.error =
        error?.error?.message ||
        error?.message ||
        'Impossible d’enregistrer cette liste.';
    } finally {
      item.saving = false;
    }
  }

  reset(item: EditableListField): void {
    item.draftOptions = [...item.options];
    item.newOption = '';
    item.error = '';
    item.success = '';
  }

  trackByFieldId(_index: number, item: EditableListField): number {
    return item.field.id;
  }

  trackByAdminFieldId(_index: number, item: AddInfoAdminFieldVm): number {
    return item.field.id;
  }

  private async refreshFieldMetadata(): Promise<void> {
    this.fields = await this.addInfoApi.listAdminFields(this.objectType);
  }

  private toEditable(item: AddInfoListFieldVm): EditableListField {
    return {
      field: item.field,
      options: [...(item.options ?? [])],
      usage: { ...(item.usage ?? {}) },
      draftOptions: [...(item.options ?? [])],
      newOption: '',
      saving: false,
      error: '',
      success: '',
    };
  }

  private normalizedDraft(item: EditableListField): string[] {
    return item.draftOptions
      .map((option) => String(option ?? '').trim())
      .filter(Boolean);
  }

  private findDuplicate(options: string[]): string | null {
    const seen = new Set<string>();
    for (const option of options) {
      const key = option.toLocaleLowerCase('fr');
      if (seen.has(key)) return option;
      seen.add(key);
    }
    return null;
  }

  private emptyFieldForm(): FieldForm {
    return {
      id: 0,
      label: '',
      kind: 'string',
      usageCount: 0,
    };
  }
}

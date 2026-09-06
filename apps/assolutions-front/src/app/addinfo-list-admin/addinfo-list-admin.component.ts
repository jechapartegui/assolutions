import { Component, OnInit } from '@angular/core';
import {
  AddInfoApiService,
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

@Component({
  selector: 'app-addinfo-list-admin',
  templateUrl: './addinfo-list-admin.component.html',
  styleUrls: ['./addinfo-list-admin.component.css'],
  standalone: false,
})
export class AddinfoListAdminComponent implements OnInit {
  items: EditableListField[] = [];
  loading = false;
  loadError = '';

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
      const fields = await this.addInfoApi.listSelectableFields();
      this.items = (fields ?? []).map((item) => this.toEditable(item));
    } catch (error) {
      console.error('Chargement des listes addinfo impossible', error);
      this.loadError =
        'Impossible de charger les listes complémentaires. Réessaie dans quelques instants.';
    } finally {
      this.loading = false;
    }
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
}

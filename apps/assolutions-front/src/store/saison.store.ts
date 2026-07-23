import { Injectable, computed, signal } from '@angular/core';

import { SaisonMapper } from '../mapper/saison.mapper';
import { SaisonPageVm, SaisonSortField, Saison_VM, SortDirection } from '../vm/saison-page.vm';
import { SaisonRepository } from '../repository/saison.repository';

@Injectable({ providedIn: 'root' })
export class SaisonStore {
  private readonly state = signal<SaisonPageVm>({
    list: [],
    filteredList: [],
    editSaison: null,

    loading: false,
    refreshing: false,
    action: '',

    readonly: true,
    isValid: false,

    filterNom: '',
    selectedSort: 'date_debut',
    selectedSortSens: 'ASC',

    selectedIds: [],

    refreshAvailable: false,
    lastLoadedAt: null,
  });

  readonly vm = computed(() => this.state());

  private initPromise: Promise<void> | null = null;

  constructor(
    private readonly repository: SaisonRepository,
    private readonly mapper: SaisonMapper,
  ) {}

  async init(force = false): Promise<void> {
    const current = this.state();

    if (!force && current.lastLoadedAt && current.list.length > 0) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.loadInitialData();

    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  async refresh(): Promise<void> {
    this.patch({ refreshing: true, action: 'Mise à jour des saisons' });

    try {
      const list = await this.repository.loadSaisons();

      this.patch({
        list,
        filteredList: this.mapper.applyFilterAndSort(
          list,
          this.state().filterNom,
          this.state().selectedSort,
          this.state().selectedSortSens,
        ),
        refreshing: false,
        refreshAvailable: false,
        lastLoadedAt: Date.now(),
        action: '',
      });
    } catch {
      this.patch({ refreshing: false, action: '' });
      throw new Error('Actualisation des saisons impossible');
    }
  }

  async loadInitialData(): Promise<void> {
    this.patch({ loading: true, action: 'Chargement des saisons' });

    try {
      const list = await this.repository.loadSaisons();

      this.patch({
        list,
        filteredList: this.mapper.applyFilterAndSort(list, '', 'date_debut', 'ASC'),
        loading: false,
        action: '',
        lastLoadedAt: Date.now(),
      });
    } catch {
      this.patch({ loading: false, action: '' });
      throw new Error('Chargement des saisons impossible');
    }
  }

  createSaison(): void {
    const item = this.mapper.createEmptySaison();

    this.patch({
      editSaison: item,
      readonly: false,
      isValid: false,
      action: 'Création d’une saison',
    });
  }

  async editSaison(id: number): Promise<void> {
    this.patch({ action: 'Chargement de la saison' });

    try {
      const item = await this.repository.loadSaisonById(id);

      this.patch({
        editSaison: item,
        readonly: true,
        isValid: true,
        action: '',
      });
    } catch {
      this.patch({ action: '' });
      throw new Error('Chargement de la saison impossible');
    }
  }

  setEditMode(edit: boolean): void {
    this.patch({ readonly: !edit });
  }

  cancelEdit(): void {
    this.patch({
      editSaison: null,
      readonly: true,
      isValid: false,
      action: '',
    });
  }

  patchEditedSaison(patch: Partial<Saison_VM>): void {
    const current = this.state().editSaison;
    if (!current) return;

    const next = {
      ...current,
      ...patch,
    } as Saison_VM;

    this.patch({
      editSaison: next,
      isValid: this.isSaisonValid(next),
    });
  }

  async saveEditedSaison(): Promise<Saison_VM> {
    const current = this.state().editSaison;
    if (!current) throw new Error('Aucune saison en cours d’édition');

    if (!this.state().isValid) {
      throw new Error('La saison est incomplète');
    }

    this.patch({ action: 'Sauvegarde de la saison' });

    try {
      const saved =
        current.id > 0
          ? await this.repository.updateSaison(current)
          : await this.repository.createSaison(current);

      const list = this.upsert(this.state().list, saved);

      this.patch({
        list,
        filteredList: this.mapper.applyFilterAndSort(
          list,
          this.state().filterNom,
          this.state().selectedSort,
          this.state().selectedSortSens,
        ),
        editSaison: saved,
        readonly: true,
        isValid: true,
        action: '',
      });

      return saved;
    } catch {
      this.patch({ action: '' });
      throw new Error('Sauvegarde de la saison impossible');
    }
  }

  async deleteSaison(id: number): Promise<void> {
    this.patch({ action: 'Suppression de la saison' });

    try {
      await this.repository.deleteSaison(id);

      const list = this.state().list.filter((x) => x.id !== id);

      this.patch({
        list,
        filteredList: this.mapper.applyFilterAndSort(
          list,
          this.state().filterNom,
          this.state().selectedSort,
          this.state().selectedSortSens,
        ),
        selectedIds: this.state().selectedIds.filter((x) => x !== id),
        action: '',
      });
    } catch {
      this.patch({ action: '' });
      throw new Error('Suppression impossible : la saison est peut-être utilisée ailleurs');
    }
  }

  async setActiveSaison(id: number): Promise<void> {
    this.patch({ action: 'Activation de la saison' });

    try {
      const list = await this.repository.setActiveSaison(id, this.state().list);

      const current = this.state().editSaison;
      const updatedCurrent = current ? list.find((x) => x.id === current.id) ?? current : null;

      this.patch({
        list,
        filteredList: this.mapper.applyFilterAndSort(
          list,
          this.state().filterNom,
          this.state().selectedSort,
          this.state().selectedSortSens,
        ),
        editSaison: updatedCurrent,
        action: '',
      });
    } catch {
      this.patch({ action: '' });
      throw new Error('Activation de la saison impossible');
    }
  }

  async deleteSelected(): Promise<number> {
    const ids = [...this.state().selectedIds];
    let count = 0;

    for (const id of ids) {
      await this.repository.deleteSaison(id);
      count++;
    }

    const list = this.state().list.filter((x) => !ids.includes(x.id));

    this.patch({
      list,
      filteredList: this.mapper.applyFilterAndSort(
        list,
        this.state().filterNom,
        this.state().selectedSort,
        this.state().selectedSortSens,
      ),
      selectedIds: [],
    });

    return count;
  }

  async duplicateSelected(): Promise<number> {
    const ids = [...this.state().selectedIds];
    const source = this.state().list.filter((x) => ids.includes(x.id));

    let count = 0;
    let list = [...this.state().list];

    for (const item of source) {
      const copy = this.mapper.clone(item);
      copy.id = 0;
      copy.active = false;
      copy.nom = `${item.nom} (copie)`;

      const created = await this.repository.createSaison(copy);
      list = this.upsert(list, created);
      count++;
    }

    this.patch({
      list,
      filteredList: this.mapper.applyFilterAndSort(
        list,
        this.state().filterNom,
        this.state().selectedSort,
        this.state().selectedSortSens,
      ),
      selectedIds: [],
    });

    return count;
  }

  setFilterNom(value: string): void {
    const vm = this.state();

    this.patch({
      filterNom: value ?? '',
      filteredList: this.mapper.applyFilterAndSort(
        vm.list,
        value ?? '',
        vm.selectedSort,
        vm.selectedSortSens,
      ),
    });
  }

  clearFilter(): void {
    this.setFilterNom('');
  }

  sortBy(field: SaisonSortField): void {
    const vm = this.state();

    const nextSens: SortDirection =
      vm.selectedSort === field && vm.selectedSortSens === 'ASC' ? 'DESC' : 'ASC';

    this.patch({
      selectedSort: field,
      selectedSortSens: nextSens,
      filteredList: this.mapper.applyFilterAndSort(
        vm.list,
        vm.filterNom,
        field,
        nextSens,
      ),
    });
  }

  toggleSelection(id: number, checked: boolean): void {
    const selected = new Set(this.state().selectedIds);

    if (checked) selected.add(id);
    else selected.delete(id);

    this.patch({ selectedIds: [...selected] });
  }

  toggleSelectAll(checked: boolean): void {
    this.patch({
      selectedIds: checked ? this.state().filteredList.map((x) => x.id) : [],
    });
  }

  clearSelection(): void {
    this.patch({ selectedIds: [] });
  }

  isSelected(id: number): boolean {
    return this.state().selectedIds.includes(id);
  }

  getPreviousLabel(saison: Saison_VM | null | undefined): string {
    return this.mapper.getPreviousLabel(saison, this.state().list);
  }

  getAvailablePreviousSaisons(currentId: number): Saison_VM[] {
    return this.state().list.filter((x) => x.id !== currentId);
  }

  private patch(patch: Partial<SaisonPageVm>): void {
    this.state.update((current) => ({
      ...current,
      ...patch,
    }));
  }

  private upsert(list: Saison_VM[], item: Saison_VM): Saison_VM[] {
    const exists = list.some((x) => x.id === item.id);

    const next = exists
      ? list.map((x) => (x.id === item.id ? item : x))
      : [...list, item];

    return this.mapper.sortBySaisonPrecedenteOrId(next);
  }

  private isSaisonValid(saison: Saison_VM): boolean {
    return (
      this.isNomValid(saison.nom) &&
      !!saison.date_debut &&
      !!saison.date_fin &&
      saison.date_debut <= saison.date_fin &&
      saison.saison_precedente !== saison.id
    );
  }

  private isNomValid(nom: string | null | undefined): boolean {
    return (nom ?? '').trim().length >= 3;
  }
}
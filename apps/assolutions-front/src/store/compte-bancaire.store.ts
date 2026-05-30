import { Injectable, computed, signal } from '@angular/core';
import { CompteBancaire_VM } from '@shared/lib/compte-bancaire.interface';
import { CompteBancaireMapper } from '../mapper/compte-bancaire.mapper';
import { CompteBancaireRepository } from '../repository/compte-bancaire.repository';
import {
  CompteBancairePageVm,
  CompteBancaireSortField,
  SortDirection,
} from '../vm/compte-bancaire.page.vm';

@Injectable({ providedIn: 'root' })
export class CompteBancaireStore {
  private readonly state = signal<CompteBancairePageVm>({
    list: [],
    filteredList: [],
    editCompteBancaire: null,

    loading: false,
    refreshing: false,
    action: '',

    readonly: true,
    isValid: false,

    filterNom: '',
    selectedSort: 'nom',
    selectedSortSens: 'ASC',

    selectedIds: [],

    refreshAvailable: false,
    lastLoadedAt: null,
  });

  readonly vm = computed(() => this.state());

  private initPromise: Promise<void> | null = null;

  constructor(
    private readonly repository: CompteBancaireRepository,
    private readonly mapper: CompteBancaireMapper,
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
    this.patch({ refreshing: true, action: 'Mise à jour des comptes bancaires' });

    try {
      const list = await this.repository.loadComptes();

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
      throw new Error('Actualisation des comptes bancaires impossible');
    }
  }

  async loadInitialData(): Promise<void> {
    this.patch({ loading: true, action: 'Chargement des comptes bancaires' });

    try {
      const list = await this.repository.loadComptes();

      this.patch({
        list,
        filteredList: this.mapper.applyFilterAndSort(list, '', 'nom', 'ASC'),
        loading: false,
        action: '',
        lastLoadedAt: Date.now(),
      });
    } catch {
      this.patch({ loading: false, action: '' });
      throw new Error('Chargement des comptes bancaires impossible');
    }
  }

  createCompte(): void {
    const item = this.mapper.createEmpty();

    this.patch({
      editCompteBancaire: item,
      readonly: false,
      isValid: false,
      action: 'Création d’un compte bancaire',
    });
  }

  async editCompte(id: number): Promise<void> {
    this.patch({ action: 'Chargement du compte bancaire' });

    try {
      const item = await this.repository.loadCompteById(id);

      this.patch({
        editCompteBancaire: item,
        readonly: true,
        isValid: this.mapper.isValid(item),
        action: '',
      });
    } catch {
      this.patch({ action: '' });
      throw new Error('Chargement du compte bancaire impossible');
    }
  }

  setEditMode(edit: boolean): void {
    this.patch({ readonly: !edit });
  }

  cancelEdit(): void {
    this.patch({
      editCompteBancaire: null,
      readonly: true,
      isValid: false,
      action: '',
    });
  }

  patchEditedCompte(patch: Partial<CompteBancaire_VM>): void {
    const current = this.state().editCompteBancaire;
    if (!current) return;

    const next = {
      ...current,
      ...patch,
    } as CompteBancaire_VM;

    this.patch({
      editCompteBancaire: next,
      isValid: this.mapper.isValid(next),
    });
  }

  async saveEditedCompte(): Promise<CompteBancaire_VM> {
    const current = this.state().editCompteBancaire;
    if (!current) throw new Error('Aucun compte bancaire en cours d’édition');

    if (!this.state().isValid) {
      throw new Error('Le compte bancaire est incomplet');
    }

    this.patch({ action: 'Sauvegarde du compte bancaire' });

    try {
      const saved =
        current.id > 0
          ? await this.repository.updateCompte(current)
          : await this.repository.createCompte(current);

      const list = this.upsert(this.state().list, saved);

      this.patch({
        list,
        filteredList: this.mapper.applyFilterAndSort(
          list,
          this.state().filterNom,
          this.state().selectedSort,
          this.state().selectedSortSens,
        ),
        editCompteBancaire: saved,
        readonly: true,
        isValid: true,
        action: '',
      });

      return saved;
    } catch {
      this.patch({ action: '' });
      throw new Error('Sauvegarde du compte bancaire impossible');
    }
  }

  async deleteCompte(id: number): Promise<void> {
    this.patch({ action: 'Suppression du compte bancaire' });

    try {
      await this.repository.deleteCompte(id);

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
      throw new Error('Suppression impossible : le compte bancaire est peut-être utilisé ailleurs');
    }
  }

  async deleteSelected(): Promise<number> {
    const ids = [...this.state().selectedIds];
    let count = 0;

    for (const id of ids) {
      await this.repository.deleteCompte(id);
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
      copy.nom = `${item.nom} (copie)`;
      copy.actif = false;

      const created = await this.repository.createCompte(copy);
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

  sortBy(field: CompteBancaireSortField): void {
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

  carteToText(value: Record<string, unknown> | null | undefined): string {
    return this.mapper.carteToText(value);
  }

  textToCarte(value: string | null | undefined): Record<string, unknown> | null {
    return this.mapper.textToCarte(value);
  }

  private patch(patch: Partial<CompteBancairePageVm>): void {
    this.state.update((current) => ({
      ...current,
      ...patch,
    }));
  }

  private upsert(list: CompteBancaire_VM[], item: CompteBancaire_VM): CompteBancaire_VM[] {
    const exists = list.some((x) => x.id === item.id);

    const next = exists
      ? list.map((x) => (x.id === item.id ? item : x))
      : [...list, item];

    return this.mapper.applyFilterAndSort(next, '', 'nom', 'ASC');
  }
}
import { Injectable, computed, signal } from '@angular/core';
import { Lieu_VM } from '@shared/lib/lieu.interface';
import { Adresse } from '@shared/lib/adresse.interface';
import { LieuRepository } from '../repository/lieu.repository';
import { LieuMapper } from '../mapper/lieu.mapper';
import { LieuPageVm, LieuSortField, SortDirection } from '../vm/lieu-page.vm';
import { AppStore } from '../app/app.store';

@Injectable({ providedIn: 'root' })
export class LieuStore {
private readonly state = signal<LieuPageVm>({
  list: [],
  filteredList: [],
  editLieu: null,

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
    private readonly repository: LieuRepository,
    private readonly mapper: LieuMapper,
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
    this.patch({ refreshing: true, action: 'Mise à jour des lieux' });

    try {
      const list = await this.repository.loadLieux();

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
      throw new Error('Actualisation des lieux impossible');
    }
  }

  async loadInitialData(): Promise<void> {
    this.patch({ loading: true, action: 'Chargement des lieux' });

    try {
      const list = await this.repository.loadLieux();

      this.patch({
        list,
        filteredList: this.mapper.applyFilterAndSort(list, '', 'nom', 'ASC'),
        loading: false,
        action: '',
        lastLoadedAt: Date.now(),
      });
    } catch {
      this.patch({ loading: false, action: '' });
      throw new Error('Chargement des lieux impossible');
    }
  }

  createLieu(): void {
    const item = this.mapper.createEmptyLieu();

    this.patch({
      editLieu: item,
      readonly: false,
      isValid: false,
      action: 'Création d’un lieu',
    });
  }

  async editLieu(id: number): Promise<void> {
    this.patch({ action: 'Chargement du lieu' });

    try {
      const item = await this.repository.loadLieuById(id);

      this.patch({
        editLieu: item,
        readonly: true,
        isValid: true,
        action: '',
      });
    } catch {
      this.patch({ action: '' });
      throw new Error('Chargement du lieu impossible');
    }
  }

  setEditMode(edit: boolean): void {
    this.patch({ readonly: !edit });
  }

  cancelEdit(): void {
    this.patch({
      editLieu: null,
      readonly: true,
      isValid: false,
      action: '',
    });
  }

  patchEditedLieu(patch: Partial<Lieu_VM>): void {
    const current = this.state().editLieu;
    if (!current) return;

    const next = {
      ...current,
      ...patch,
    } as Lieu_VM;

    this.patch({
      editLieu: next,
      isValid: this.isLieuValid(next),
    });
  }

  updateAdresse(adresse: Adresse): void {
    this.patchEditedLieu({ adresse } as Partial<Lieu_VM>);
  }

  setAddressValidity(valid: boolean): void {
    const current = this.state().editLieu;

    this.patch({
      isValid: !!current && this.isNomValid(current.nom) && valid,
    });
  }

  async saveEditedLieu(): Promise<Lieu_VM> {
    const current = this.state().editLieu;
    if (!current) throw new Error('Aucun lieu en cours d’édition');

    if (!this.state().isValid) {
      throw new Error('Le lieu est incomplet');
    }

    this.patch({ action: 'Sauvegarde du lieu' });

    try {
      const saved =
        current.id > 0
          ? await this.repository.updateLieu(current)
          : await this.repository.createLieu(current);

      const list = this.upsert(this.state().list, saved);

      this.patch({
        list,
        filteredList: this.mapper.applyFilterAndSort(
          list,
          this.state().filterNom,
          this.state().selectedSort,
          this.state().selectedSortSens,
        ),
        editLieu: saved,
        readonly: true,
        isValid: true,
        action: '',
      });

      return saved;
    } catch {
      this.patch({ action: '' });
      throw new Error('Sauvegarde du lieu impossible');
    }
  }

  async deleteLieu(id: number): Promise<void> {
    this.patch({ action: 'Suppression du lieu' });

    try {
      await this.repository.deleteLieu(id);

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
      throw new Error('Suppression impossible : le lieu est peut-être utilisé ailleurs');
    }
  }

  async deleteSelected(): Promise<number> {
    const ids = [...this.state().selectedIds];
    let count = 0;

    for (const id of ids) {
      await this.repository.deleteLieu(id);
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

      const created = await this.repository.createLieu(copy);
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

  sortBy(field: LieuSortField): void {
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

  formatAdresse(adresse: Adresse): string {
    return `${adresse.Street}, ${adresse.PostCode} ${adresse.City}`;
  }

  private patch(patch: Partial<LieuPageVm>): void {
    this.state.update((current) => ({
      ...current,
      ...patch,
    }));
  }

  private upsert(list: Lieu_VM[], item: Lieu_VM): Lieu_VM[] {
    const exists = list.some((x) => x.id === item.id);
    const next = exists
      ? list.map((x) => (x.id === item.id ? item : x))
      : [...list, item];

    return this.mapper.applyFilterAndSort(
      next,
      this.state().filterNom,
      this.state().selectedSort,
      this.state().selectedSortSens,
    );
  }

  private isLieuValid(lieu: Lieu_VM): boolean {
    return this.isNomValid(lieu.nom);
  }

  private isNomValid(nom: string | null | undefined): boolean {
    return (nom ?? '').trim().length >= 5;
  }
}
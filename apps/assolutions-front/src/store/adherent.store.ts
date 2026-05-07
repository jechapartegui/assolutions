import { Injectable, computed, signal } from '@angular/core';
import { CachedScreenStore } from './cached-screen.store';
import { AdherentMapper } from '../mapper/adherent.mapper';
import { AdherentRepository } from '../repository/adherent.repository';
import {
  AdherentDetail_VM,
  AdherentFilterVm,
  AdherentListItem_VM,
  AdherentPageVm,
} from '../vm/adherent-page.vm';

function createInitialVm(): AdherentPageVm {
  return {
    refs: {
      listeSaison: [],
      listeArchive: [],
      liste_groupe_filter:[]
    },
    list: [],
    activeSaison: null,

    loading: false,
    filter: new AdherentFilterVm(),
    selectedFilter: 'nom',
    selectedSort: 'nom',
    selectedSortSens: 'ASC',

    showFilterPanel: false,
    showSortPanel: false,
    showScrollToTop: false,

    editAdherent: null,
    readonly: false,
    isValid: false,

    lastLoadedAt: null,
    refreshAvailable: false,
    pendingCount: 0,
    action: '',

    multiSelectMode: false,
    selectedIds: [],
  };
}

@Injectable({ providedIn: 'root' })
export class AdherentStore extends CachedScreenStore<AdherentPageVm> {
  private static readonly TTL_MS = 5 * 60 * 1000;

  private readonly state = signal<AdherentPageVm>(createInitialVm());
  readonly vm = computed(() => this.state());

  private initPromise: Promise<void> | null = null;
  private silentRefreshPromise: Promise<void> | null = null;
  private hardRefreshPromise: Promise<void> | null = null;

  constructor(
    private readonly repository: AdherentRepository,
    private readonly mapper: AdherentMapper,
  ) {
    super(AdherentStore.TTL_MS);
  }

  async init(saisonId: number): Promise<void> {
    const current = this.state();

    if (
      current.activeSaison &&
      current.activeSaison.id === saisonId &&
      this.hasCurrentCache(true)
    ) {
      if (this.shouldRefreshSilently(true, current.lastLoadedAt ?? null)) {
        void this.refreshSilently(saisonId);
      }
      return;
    }

    if (this.initPromise) return this.initPromise;

    this.initPromise = this.loadInitialData(saisonId);
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async loadInitialData(saisonId: number): Promise<void> {
    this.patch({ loading: true, action: 'Chargement des adhérents' });

    try {
      const data = await this.repository.loadPageData(saisonId);

      const nextVm: AdherentPageVm = {
        ...this.state(),
        ...data,
        loading: false,
        filter: this.mapper.createDefaultFilter(),
      };

      this.setCurrentData(nextVm);

      this.state.set({
        ...nextVm,
        lastLoadedAt: Date.now(),
        refreshAvailable: false,
        pendingCount: 0,
      });
    } catch {
      this.patch({ loading: false, action: '' });
      throw new Error('Chargement de la page adhérent impossible');
    }
  }

  async openAdherent(id: number, saisonId: number): Promise<void> {
    this.patch({ loading: true, action: 'Chargement de la fiche adhérent' });

    try {
      const editAdherent = await this.repository.loadAdherentDetail(id, saisonId);
      this.patch({
        editAdherent,
        loading: false,
        action: '',
      });
    } catch {
      this.patch({ loading: false, action: '' });
      throw new Error('Chargement de la fiche adhérent impossible');
    }
  }

  createEmpty(): void {
    const editAdherent = new AdherentDetail_VM();
    this.patch({
      editAdherent,
      isValid: false,
    });
  }

  closeDetail(): void {
    this.patch({
      editAdherent: null,
      isValid: false,
    });
  }

  patch(partial: Partial<AdherentPageVm>): void {
    this.state.update((vm) => ({ ...vm, ...partial }));
  }

  patchDetail(partial: Partial<AdherentDetail_VM>): void {
    const current = this.state().editAdherent;
    if (!current) return;

    this.patch({
      editAdherent: { ...current, ...partial } as AdherentDetail_VM,
    });
  }

  applySort(type: 'nom' | 'sexe' | 'date_naissance', sens: 'ASC' | 'DESC'): void {
    let list = [...this.state().list];

    switch (type) {
      case 'sexe':
        list = this.mapper.sortBySexe(list, sens);
        break;
      case 'date_naissance':
        list = this.mapper.sortByDateNaissance(list, sens);
        break;
      case 'nom':
      default:
        list = this.mapper.sortByNom(list, sens);
        break;
    }

    this.patch({
      list,
      selectedSort: type,
      selectedSortSens: sens,
    });
  }

  toggleSelectedAdherent(id: number): void {
    const current = this.state().selectedIds ?? [];
    const exists = current.includes(id);

    this.patch({
      selectedIds: exists
        ? current.filter((x) => x !== id)
        : [...current, id],
    });
  }

  clearSelection(): void {
    this.patch({
      selectedIds: [],
      multiSelectMode: false,
    });
  }

  async deleteSelectedAdherents(): Promise<void> {
    const ids = [...(this.state().selectedIds ?? [])];
    if (!ids.length) return;

    for (const id of ids) {
      await this.repository.deleteAdherent(id);
    }

    const saisonId = this.state().activeSaison?.id ?? 0;
    if (saisonId > 0) {
      await this.refreshNow(saisonId);
    }

    this.clearSelection();
  }

  async saveDetail(): Promise<AdherentDetail_VM> {
    const current = this.state().editAdherent;
    if (!current) {
      throw new Error('Aucun adhérent en cours d’édition');
    }

    const saisonId =
      this.state().activeSaison?.id ??
      current.inscriptionsSaison.find((x) => x.active)?.saison_id ??
      0;

    this.patch({ action: 'Sauvegarde de l’adhérent' });

    try {
      let saved: AdherentDetail_VM;
      if ((current.id ?? 0) > 0) {
        saved = await this.repository.updateAdherent(current, saisonId);
      } else {
        saved = await this.repository.createAdherent(current);
      }

      const refreshedListItem = this.toListItem(saved, saisonId);
      const updatedList = this.upsertListItem(this.state().list, refreshedListItem);

      this.patch({
        list: updatedList,
        editAdherent: saved,
        action: '',
      });

      this.syncCurrentSnapshot();
      return saved;
    } catch (e) {
      this.patch({ action: '' });
      throw e;
    }
  }

  async refreshSilently(saisonId: number): Promise<void> {
    if (this.silentRefreshPromise) return this.silentRefreshPromise;

    this.silentRefreshPromise = this.runSilentRefresh(saisonId);
    try {
      await this.silentRefreshPromise;
    } finally {
      this.silentRefreshPromise = null;
    }
  }

  private async runSilentRefresh(saisonId: number): Promise<void> {
    try {
      const data = await this.repository.loadPageData(saisonId);

      const freshVm: AdherentPageVm = {
        ...this.state(),
        ...data,
        loading: false,
        filter: this.state().filter,
        selectedFilter: this.state().selectedFilter,
        selectedSort: this.state().selectedSort,
        selectedSortSens: this.state().selectedSortSens,
        showFilterPanel: this.state().showFilterPanel,
        showSortPanel: this.state().showSortPanel,
        showScrollToTop: this.state().showScrollToTop,
        editAdherent: this.state().editAdherent,
        readonly: this.state().readonly,
        isValid: this.state().isValid,
        multiSelectMode: this.state().multiSelectMode,
        selectedIds: this.state().selectedIds,
      };

      const changed = this.hasVmChanged(this.currentData, freshVm);

      if (!changed) {
        this.setPendingData(null);
        this.patch({
          lastLoadedAt: Date.now(),
          refreshAvailable: false,
          pendingCount: 0,
        });
        return;
      }

      this.setPendingData(freshVm);
      this.patch({
        refreshAvailable: true,
        pendingCount: this.computePendingCount(this.currentData, freshVm),
      });
    } catch { /* empty */ }
  }

  async refreshNow(saisonId: number): Promise<void> {
    if (this.hardRefreshPromise) return this.hardRefreshPromise;

    this.hardRefreshPromise = this.runHardRefresh(saisonId);
    try {
      await this.hardRefreshPromise;
    } finally {
      this.hardRefreshPromise = null;
    }
  }

  private async runHardRefresh(saisonId: number): Promise<void> {
    this.patch({ loading: true, action: 'Actualisation des adhérents' });

    try {
      const data = await this.repository.loadPageData(saisonId);

      const nextVm: AdherentPageVm = {
        ...this.state(),
        ...data,
        loading: false,
        filter: this.state().filter,
      };

      this.setCurrentData(nextVm);

      this.state.set({
        ...nextVm,
        lastLoadedAt: Date.now(),
        refreshAvailable: false,
        pendingCount: 0,
      });
    } catch {
      this.patch({ loading: false, action: '' });
      throw new Error('Actualisation de la page adhérent impossible');
    }
  }

  applyRefresh(): void {
    const applied = this.applyPendingData();
    if (!applied) return;

    this.state.set({
      ...applied,
      lastLoadedAt: Date.now(),
      refreshAvailable: false,
      pendingCount: 0,
    });
  }

  reset(): void {
    this.clearCacheData();
    this.initPromise = null;
    this.silentRefreshPromise = null;
    this.hardRefreshPromise = null;
    this.state.set(createInitialVm());
  }

  private toListItem(detail: AdherentDetail_VM, saisonId: number): AdherentListItem_VM {
    const item = new AdherentListItem_VM();
    Object.assign(item, detail);

    item.saisonActiveId = saisonId;
    item.inscrit = detail.inscriptionsSaison.some(
      (x) => x.saison_id === saisonId && x.active === true,
    );
    item.groupesActifs = detail.groupesParSaison ?? [];
    item.nbInscriptionsSeance = detail.inscriptionsSeance?.length ?? 0;

    return item;
  }

  private upsertListItem(list: AdherentListItem_VM[], saved: AdherentListItem_VM): AdherentListItem_VM[] {
    const exists = list.some((x) => x.id === saved.id);
    const next = exists
      ? list.map((x) => (x.id === saved.id ? saved : x))
      : [...list, saved];

    switch (this.state().selectedSort) {
      case 'sexe':
        return this.mapper.sortBySexe(next, this.state().selectedSortSens);
      case 'date_naissance':
        return this.mapper.sortByDateNaissance(next, this.state().selectedSortSens);
      case 'nom':
      default:
        return this.mapper.sortByNom(next, this.state().selectedSortSens);
    }
  }
  toggleMultiSelectMode(): void {
  const vm = this.state();
  this.patch({
    multiSelectMode: !vm.multiSelectMode,
    selectedIds: !vm.multiSelectMode ? vm.selectedIds : [],
  });
}

  private syncCurrentSnapshot(): void {
    const snapshot: AdherentPageVm = {
      ...this.state(),
      refreshAvailable: false,
      pendingCount: 0,
      lastLoadedAt: Date.now(),
    };

    this.setCurrentData(snapshot);
    this.setPendingData(null);
    this.state.set(snapshot);
  }

  private hasVmChanged(current: AdherentPageVm | null, fresh: AdherentPageVm): boolean {
    if (!current) return true;
    return this.computeFingerprint(current) !== this.computeFingerprint(fresh);
  }

  private computeFingerprint(vm: AdherentPageVm): string {
    const listPart = (vm.list ?? [])
      .map((p) =>
        [
          p.id ?? '',
          p.nom ?? '',
          p.prenom ?? '',
          p.inscrit ?? '',
          p.archive ?? '',
          (p.groupesActifs ?? []).map((g) => g.id).sort().join(','),
        ].join(':')
      )
      .sort()
      .join('|');

    const saisonPart = `${vm.activeSaison?.id ?? ''}`;
    return [listPart, saisonPart].join('§§§');
  }

  private computePendingCount(current: AdherentPageVm | null, fresh: AdherentPageVm): number {
    if (!current) return fresh.list?.length ?? 0;

    const currentIds = new Set((current.list ?? []).map((x) => x.id));
    let count = 0;

    for (const item of fresh.list ?? []) {
      if (!currentIds.has(item.id)) count++;
    }

    return count;
  }
}
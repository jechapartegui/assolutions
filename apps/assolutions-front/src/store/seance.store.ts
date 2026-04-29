import { Injectable, computed, signal } from '@angular/core';
import { Seance_VM } from '@shared/index';

import { SeanceMapper } from '../mapper/seance.mapper';
import { SeanceRepository } from '../repository/seance.repository';
import { CachedScreenStore } from './cached-screen.store';
import { SeanceFilterVm } from '../vm/seance-filter.vm';
import { SeancePageVm } from '../vm/seance-page.vm';
import { MenuStore } from './menu.store';

function createInitialVm(): SeancePageVm {
  return {
    refs: {
      listeCours: [],
      listeGroupe: [],
      listeLieu: [],
      listeProf: [],
      listeSaison: [],
      liste_lieu_filter: [],
      liste_prof_filter: [],
      liste_groupe_filter: [],
      listeStatuts: [],
    },
    list: [],
    activeSaison: null,
    loading: false,
    filter: new SeanceFilterVm(),
    selectedFilter: 'nom',
    selectedSort: 'date',
    selectedSortSens: 'ASC',
    showFilterPanel: false,
    showSortPanel: false,
    showScrollToTop: false,
    editSeance: null,
    editModeSerie: false,
    readonly: false,
    isValid: false,
    lastLoadedAt: null,
    refreshAvailable: false,
    multiSelectMode: false,
    selectedIds: [],
    pendingCount: 0,
    action: '',
  };
}

@Injectable({ providedIn: 'root' })
export class SeanceStore extends CachedScreenStore<SeancePageVm> {
  private static readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  private readonly state = signal<SeancePageVm>(createInitialVm());
  readonly vm = computed(() => this.state());

  private initPromise: Promise<void> | null = null;
  private silentRefreshPromise: Promise<void> | null = null;
  private hardRefreshPromise: Promise<void> | null = null;

  constructor(
    private readonly repository: SeanceRepository,
    private readonly mapper: SeanceMapper,
    private readonly menuStore: MenuStore,
  ) {
    super(SeanceStore.TTL_MS);
  }

  async init(saisonId: number): Promise<void> {
    const current = this.state();

    if (this.hasCurrentCache(current.activeSaison?.id === saisonId || current.activeSaison === saisonId as any)) {
      if (this.shouldRefreshSilently(true, this.state().lastLoadedAt ?? null)) {
        void this.refreshSilently(saisonId);
      }
      return;
    }

    if (
      current.activeSaison &&
      this.extractSaisonId(current.activeSaison) === saisonId &&
      this.hasCurrentCache(true)
    ) {
      if (this.shouldRefreshSilently(true, this.state().lastLoadedAt ?? null)) {
        void this.refreshSilently(saisonId);
      }
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.loadInitialData(saisonId);

    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async loadInitialData(saisonId: number): Promise<void> {
    this.patch({
      loading: true,
      action: 'Chargement des séances',
    } as Partial<SeancePageVm>);

    try {
      const data = await this.repository.loadPageData(saisonId);

      const nextVm: SeancePageVm = {
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
      } as SeancePageVm);
    } catch {
      this.patch({
        loading: false,
        action: '',
      } as Partial<SeancePageVm>);
      throw new Error('Chargement de la page séance impossible');
    }
  }

  async refreshSilently(saisonId: number): Promise<void> {
    if (this.silentRefreshPromise) {
      return this.silentRefreshPromise;
    }

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

      const freshVm: SeancePageVm = {
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
        editSeance: this.state().editSeance,
        editModeSerie: this.state().editModeSerie,
        readonly: this.state().readonly,
        isValid: this.state().isValid,
        multiSelectMode: false,
selectedIds: [],
      };

      const changed = this.hasVmChanged(this.currentData, freshVm);

      if (!changed) {
        this.setPendingData(null);
        this.patch({
          lastLoadedAt: Date.now(),
          refreshAvailable: false,
          pendingCount: 0,
        } as Partial<SeancePageVm>);
        return;
      }

      this.setPendingData(freshVm);
      this.patch({
        refreshAvailable: true,
        pendingCount: this.computePendingCount(this.currentData, freshVm),
      } as Partial<SeancePageVm>);
    } catch {
      // silencieux => on n'écrase rien
    }
  }
toggleMultiSelectMode(): void {
  const vm = this.state();
  this.patch({
    multiSelectMode: !vm.multiSelectMode,
    selectedIds: !vm.multiSelectMode ? vm.selectedIds : [],
  });
}

clearSelection(): void {
  this.patch({
    selectedIds: [],
    multiSelectMode: false,
  });
}
async duplicateCurrentSeance(): Promise<void> {
  const current = this.state().editSeance;
  if (!current) return;

  let savedId = current.id;

  if (current.id > 0) {
    await this.repository.updateSeance(current);
    savedId = current.id;
  } else {
    const created = await this.repository.createSeance(current);
    savedId = created.id;
  }

  await this.repository.updateSeanceProfs(savedId, current.seanceProfesseurs as any);
  await this.repository.updateSeanceGroupes(
    savedId,
    (current.groupes ?? [])
      .map((g: any) => g.groupe_id ?? g.id)
      .filter((id: number) => id > 0)
  );

  const clone = this.cloneAsNew(current);

  this.patch({
    editSeance: clone,
    isValid: true,
  });
}

private cloneAsNew(source: Seance_VM): Seance_VM {
  const clone : Seance_VM = typeof structuredClone === 'function'
    ? structuredClone(source)
    : JSON.parse(JSON.stringify(source));

  clone.id = 0;

  return clone;
}
toggleSelectedSeance(id: number): void {
  const current = this.state().selectedIds ?? [];
  const exists = current.includes(id);

  this.patch({
    selectedIds: exists
      ? current.filter((x) => x !== id)
      : [...current, id],
  });
}
async deleteSelectedSeances(): Promise<void> {
  const ids = [...(this.state().selectedIds ?? [])];
  if (!ids.length) return;

  for (const id of ids) {
    await this.repository.deleteSeance(id);
  }

  const saisonId = this.state().activeSaison?.id ?? 0;
  if (saisonId > 0) {
    await this.refreshNow(saisonId);
  }

  this.patch({
    selectedIds: [],
    multiSelectMode: false,
  });
}
  async refreshNow(saisonId: number): Promise<void> {
    if (this.hardRefreshPromise) {
      return this.hardRefreshPromise;
    }

    this.hardRefreshPromise = this.runHardRefresh(saisonId);

    try {
      await this.hardRefreshPromise;
    } finally {
      this.hardRefreshPromise = null;
    }
  }

  private async runHardRefresh(saisonId: number): Promise<void> {
    this.patch({
      loading: true,
      action: 'Actualisation des séances',
    } as Partial<SeancePageVm>);

    try {
      const data = await this.repository.loadPageData(saisonId);

      const nextVm: SeancePageVm = {
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
      } as SeancePageVm);
    } catch {
      this.patch({
        loading: false,
        action: '',
      } as Partial<SeancePageVm>);
      throw new Error('Actualisation de la page séance impossible');
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
    } as SeancePageVm);
  }

  openSeance(id: number, saisonId: number): Promise<void> {
    return this.loadSeanceIntoEditor(id, saisonId);
  }

  private async loadSeanceIntoEditor(id: number, saisonId: number): Promise<void> {
    const seance = await this.repository.loadSeance(id, saisonId);
    this.patch({ editSeance: seance, editModeSerie: false });
  }

  createEmpty(activeSaisonId: number, serie = false): void {
    const seance = new Seance_VM();
    seance.saison_id = activeSaisonId;

    this.patch({
      editSeance: seance,
      editModeSerie: serie,
      isValid: false,
    });
  }

  closeEditor(): void {
    this.patch({
      editSeance: null,
      editModeSerie: false,
      isValid: false,
    });
  }

  patch(partial: Partial<SeancePageVm>): void {
    this.state.update((vm) => ({ ...vm, ...partial }));
  }

  patchEditSeance(partial: Partial<Seance_VM>): void {
    const current = this.state().editSeance;
    if (!current) return;

    this.patch({
      editSeance: { ...current, ...partial } as Seance_VM,
    });
  }

  applySort(type: 'nom' | 'date' | 'cours' | 'lieu', sens: 'ASC' | 'DESC'): void {
    const vm = this.state();
    let list = [...vm.list];

    switch (type) {
      case 'nom':
        list = this.mapper.sortByNom(list, sens);
        break;
      case 'date':
        list = this.mapper.sortByDate(list, sens);
        break;
      case 'cours':
        list = this.mapper.sortByCours(list, sens);
        break;
      case 'lieu':
        list = this.mapper.sortByLieu(list, sens);
        break;
    }

    this.patch({
      list,
      selectedSort: type,
      selectedSortSens: sens,
    });
  }

  invalidate(): void {
    this.clearCacheData();
    this.state.set({
      ...createInitialVm(),
      refreshAvailable: false,
      pendingCount: 0,
      lastLoadedAt: null,
    } as SeancePageVm);
  }

  reset(): void {
    this.clearCacheData();
    this.initPromise = null;
    this.silentRefreshPromise = null;
    this.hardRefreshPromise = null;
    this.state.set(createInitialVm());
  }

  private hasVmChanged(
    current: SeancePageVm | null,
    fresh: SeancePageVm,
  ): boolean {
    if (!current) return true;

    const currentFp = this.computeFingerprint(current);
    const freshFp = this.computeFingerprint(fresh);

    return currentFp !== freshFp;
  }

  private computeFingerprint(vm: SeancePageVm): string {
    const refsPart = [
      (vm.refs.listeCours ?? []).map((x: any) => `${x.id}:${x.nom ?? ''}`).sort().join('|'),
      (vm.refs.listeGroupe ?? []).map((x: any) => `${x.id}:${x.nom ?? ''}`).sort().join('|'),
      (vm.refs.listeLieu ?? []).map((x: any) => `${x.id}:${x.nom ?? ''}`).sort().join('|'),
      (vm.refs.listeProf ?? []).map((x: any) => `${x.id}:${x.nom ?? ''}:${x.prenom ?? ''}`).sort().join('|'),
      (vm.refs.listeSaison ?? []).map((x: any) => `${x.id}:${x.nom ?? ''}`).sort().join('|'),
    ].join('///');

    const listPart = (vm.list ?? [])
      .map((s: any) => [
        s.id ?? '',
        s.nom ?? '',
        s.date_seance ?? '',
        s.heure_debut ?? '',
        s.cours ?? '',
        s.lieu_id ?? '',
        s.statut ?? '',
      ].join(':'))
      .sort()
      .join('|');

    const saisonPart = `${this.extractSaisonId(vm.activeSaison) ?? ''}`;

    return [refsPart, listPart, saisonPart].join('§§§');
  }

  private computePendingCount(
    current: SeancePageVm | null,
    fresh: SeancePageVm,
  ): number {
    if (!current) return fresh.list?.length ?? 0;

    const currentIds = new Set((current.list ?? []).map((x: any) => x.id));
    let count = 0;

    for (const item of fresh.list ?? []) {
      if (!currentIds.has((item as any).id)) {
        count++;
      }
    }

    return count;
  }

  private extractSaisonId(activeSaison: unknown): number | null {
    if (typeof activeSaison === 'number') return activeSaison;
    if (activeSaison && typeof activeSaison === 'object' && 'id' in activeSaison) {
      const id = (activeSaison as { id?: unknown }).id;
      return typeof id === 'number' ? id : null;
    }
    return null;
  }
  async saveEditedSeance(): Promise<Seance_VM> {
  const current = this.state().editSeance;
  const saisonId = this.state().activeSaison?.id ?? 0;

  if (!current) {
    throw new Error('Aucune séance en cours d’édition');
  }
  if (!saisonId) {
    throw new Error('Saison active introuvable');
  }

  this.patch({
    action: 'Sauvegarde de la séance',
  } as Partial<SeancePageVm>);

  try {
    let savedId = current.id ?? 0;

    if (savedId > 0) {
      await this.repository.updateSeance(current);
    } else {
      const created = await this.repository.createSeance(current);
      savedId = created.id;
    }

    await this.repository.updateSeanceProfs(
      savedId,
      (current.seanceProfesseurs ?? []) as any
    );

    const groupeIds = (current.groupes ?? [])
      .map((g: any) => g.groupe_id ?? g.id)
      .filter((id: number) => typeof id === 'number' && id > 0);

    await this.repository.updateSeanceGroupes(savedId, groupeIds);

    const reloaded = await this.repository.loadSeance(savedId, saisonId);
    this.menuStore.patchLocalSeance(reloaded);
    const updatedList = this.upsertSeanceInList(this.state().list ?? [], reloaded);

    this.patch({
      list: updatedList,
      editSeance: reloaded,
      action: '',
    });

    this.syncCurrentSnapshot();

    return reloaded;
  } catch (e) {
    this.patch({
      action: '',
    } as Partial<SeancePageVm>);
    throw e;
  }
}
private upsertSeanceInList(list: Seance_VM[], saved: Seance_VM): Seance_VM[] {
  const exists = list.some((x) => x.id === saved.id);

  const next = exists
    ? list.map((x) => (x.id === saved.id ? saved : x))
    : [...list, saved];

  return this.applyCurrentSort(next);
}

private applyCurrentSort(list: Seance_VM[]): Seance_VM[] {
  const vm = this.state();

  switch (vm.selectedSort) {
    case 'nom':
      return this.mapper.sortByNom(list, vm.selectedSortSens);
    case 'cours':
      return this.mapper.sortByCours(list, vm.selectedSortSens);
    case 'lieu':
      return this.mapper.sortByLieu(list, vm.selectedSortSens);
    case 'date':
    default:
      return this.mapper.sortByDate(list, vm.selectedSortSens);
  }
}

private syncCurrentSnapshot(): void {
  const snapshot: SeancePageVm = {
    ...this.state(),
    refreshAvailable: false,
    pendingCount: 0,
    lastLoadedAt: Date.now(),
  };

  this.setCurrentData(snapshot);
  this.setPendingData(null);

  this.state.set(snapshot);
}
}
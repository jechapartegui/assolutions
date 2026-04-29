import { Injectable, computed, signal } from '@angular/core';
import { Cours_VM } from '@shared/index';

import { CachedScreenStore } from './cached-screen.store';
import { CoursRepository } from '../repository/cours.repository';
import { CoursFilterVm } from '../vm/cours-filter.vm';
import { CoursPageVm } from '../vm/cours-page.vm';
import { CoursMapper } from '../mapper/cours.mapper';

function createInitialVm(): CoursPageVm {
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
      liste_jour_filter: [],
    },
    list: [],
    activeSaison: null,
    loading: false,
    filter: new CoursFilterVm(),
    selectedFilter: 'nom',
    selectedSort: 'nom',
    selectedSortSens: 'ASC',
    showFilterPanel: false,
    showSortPanel: false,
    showScrollToTop: false,
    editCours: null,
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
export class CoursStore extends CachedScreenStore<CoursPageVm> {
  private static readonly TTL_MS = 5 * 60 * 1000;

  private readonly state = signal<CoursPageVm>(createInitialVm());
  readonly vm = computed(() => this.state());

  private initPromise: Promise<void> | null = null;
  private silentRefreshPromise: Promise<void> | null = null;
  private hardRefreshPromise: Promise<void> | null = null;

  constructor(private readonly repository: CoursRepository, private readonly mapper: CoursMapper) {
    super(CoursStore.TTL_MS);
  }

  async init(saisonId: number): Promise<void> {
    const current = this.state();

    if (this.hasCurrentCache(current.activeSaison?.id === saisonId || current.activeSaison === (saisonId as any))) {
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
      action: 'Chargement des cours',
    });

    try {
      const data = await this.repository.loadPageData(saisonId);

      const nextVm: CoursPageVm = {
        ...this.state(),
        ...data,
        loading: false,
        filter: new CoursFilterVm(),
      };

      this.setCurrentData(nextVm);

      this.state.set({
        ...nextVm,
        lastLoadedAt: Date.now(),
        refreshAvailable: false,
        pendingCount: 0,
      });
    } catch {
      this.patch({
        loading: false,
        action: '',
      });
      throw new Error('Chargement de la page cours impossible');
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
async duplicateCurrentCours(): Promise<void> {
  const current = this.state().editCours;
  if (!current) return;

  let savedId = current.id;

  if (current.id > 0) {
    await this.repository.updateCours(current);
    savedId = current.id;
  } else {
    const created = await this.repository.createCours(current);
    savedId = created.id;
  }

  await this.repository.updateCoursProfs(savedId, current.professeursCours as any);
  await this.repository.updateCoursGroupes(
    savedId,
    (current.groupes ?? [])
      .map((g: any) => g.groupe_id ?? g.id)
      .filter((id: number) => id > 0)
  );

  const clone = this.cloneAsNew(current);

  this.patch({
    editCours: clone,
    isValid: true,
  });
}

  async saveEditedCours(): Promise<Cours_VM> {
  const current = this.state().editCours;
  const saisonId = this.state().activeSaison?.id ?? 0;

  if (!current) {
    throw new Error('Aucun cours en cours d’édition');
  }
  if (!saisonId) {
    throw new Error('Saison active introuvable');
  }

  this.patch({
    action: 'Sauvegarde du cours',
  } as Partial<CoursPageVm>);

  try {
    let savedId = current.id ?? 0;

    if (savedId > 0) {
      await this.repository.updateCours(current);
    } else {
      const created = await this.repository.createCours(current);
      savedId = created.id;
    }

    await this.repository.updateCoursProfs(
      savedId,
      (current.professeursCours ?? []) as any
    );

    const groupeIds = (current.groupes ?? [])
      .map((g: any) => g.groupe_id ?? g.id)
      .filter((id: number) => typeof id === 'number' && id > 0);

    await this.repository.updateCoursGroupes(savedId, groupeIds);

    const reloaded = await this.repository.loadCoursById(savedId, saisonId);

    const updatedList = this.upsertCoursInList(this.state().list ?? [], reloaded);

    this.patch({
      list: updatedList,
      editCours: reloaded,
      action: '',
    });

    this.syncCurrentSnapshot();

    return reloaded;
  } catch (e) {
    this.patch({
      action: '',
    } as Partial<CoursPageVm>);
    throw e;
  }
}
private upsertCoursInList(list: Cours_VM[], saved: Cours_VM): Cours_VM[] {
  const exists = list.some((x) => x.id === saved.id);

  const next = exists
    ? list.map((x) => (x.id === saved.id ? saved : x))
    : [...list, saved];

  return this.applyCurrentSort(next);
}

private applyCurrentSort(list: Cours_VM[]): Cours_VM[] {
  const vm = this.state();

  switch (vm.selectedSort) {
    case 'nom':
      return this.mapper.sortByNom(list, vm.selectedSortSens);
    case 'lieu':
      return this.mapper.sortByLieu(list, vm.selectedSortSens);
    case 'jour':
    default:
      return this.mapper.sortByJour(list, vm.selectedSortSens);
  }
}


private syncCurrentSnapshot(): void {
  const snapshot: CoursPageVm = {
    ...this.state(),
    refreshAvailable: false,
    pendingCount: 0,
    lastLoadedAt: Date.now(),
  };

  this.setCurrentData(snapshot);
  this.setPendingData(null);

  this.state.set(snapshot);
}

private cloneAsNew(source: Cours_VM): Cours_VM {
  const clone : Cours_VM = typeof structuredClone === 'function'
    ? structuredClone(source)
    : JSON.parse(JSON.stringify(source));

  clone.id = 0;

  return clone;
}
toggleSelectedCours(id: number): void {
  const current = this.state().selectedIds ?? [];
  const exists = current.includes(id);

  this.patch({
    selectedIds: exists
      ? current.filter((x) => x !== id)
      : [...current, id],
  });
}
async deleteSelectedCours(): Promise<void> {
  const ids = [...(this.state().selectedIds ?? [])];
  if (!ids.length) return;

  for (const id of ids) {
    await this.repository.deleteCours(id);
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

      const freshVm: CoursPageVm = {
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
        editCours: this.state().editCours,
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
        });
        return;
      }

      this.setPendingData(freshVm);
      this.patch({
        refreshAvailable: true,
        pendingCount: this.computePendingCount(this.currentData, freshVm),
      });
    } catch {
      // refresh silencieux => on ne casse rien
    }
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
      action: 'Actualisation des cours',
    });

    try {
      const data = await this.repository.loadPageData(saisonId);

      const nextVm: CoursPageVm = {
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
      this.patch({
        loading: false,
        action: '',
      });
      throw new Error('Actualisation de la page cours impossible');
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

  async openCours(id: number, saisonId: number): Promise<void> {
    const cours = await this.repository.loadCoursById(id, saisonId);
    this.patch({ editCours: cours });
  }

  createEmpty(activeSaisonId: number): void {
    const cours = new Cours_VM();
    cours.saison_id = activeSaisonId;
    cours.professeursCours = [];
    cours.groupes = [];

    this.patch({
      editCours: cours,
      isValid: false,
    });
  }

  closeEditor(): void {
    this.patch({
      editCours: null,
      isValid: false,
    });
  }

  patch(partial: Partial<CoursPageVm>): void {
    this.state.update((vm) => ({ ...vm, ...partial }));
  }

  patchEditCours(partial: Partial<Cours_VM>): void {
    const current = this.state().editCours;
    if (!current) return;

    this.patch({
      editCours: { ...current, ...partial } as Cours_VM,
    });
  }

  applySort(type: 'nom' | 'jour' | 'lieu', sens: 'ASC' | 'DESC'): void {
    const vm = this.state();
    let list = [...vm.list];

    switch (type) {
      case 'nom':
        list.sort((a, b) => this.compareStrings(a.nom ?? '', b.nom ?? '', sens));
        break;
      case 'jour':
        list.sort((a, b) => this.compareJour(a.jour_semaine ?? '', b.jour_semaine ?? '', sens));
        break;
      case 'lieu':
        list.sort((a, b) => this.compareStrings(a.lieu?.nom ?? '', b.lieu?.nom ?? '', sens));
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
    });
  }

  reset(): void {
    this.clearCacheData();
    this.initPromise = null;
    this.silentRefreshPromise = null;
    this.hardRefreshPromise = null;
    this.state.set(createInitialVm());
  }

  private compareStrings(a: string, b: string, sens: 'ASC' | 'DESC'): number {
    const aa = this.normalize(a);
    const bb = this.normalize(b);
    const result = aa.localeCompare(bb, 'fr');
    return sens === 'ASC' ? result : -result;
  }

  private compareJour(a: string, b: string, sens: 'ASC' | 'DESC'): number {
    const order: Record<string, number> = {
      lundi: 1,
      mardi: 2,
      mercredi: 3,
      jeudi: 4,
      vendredi: 5,
      samedi: 6,
      dimanche: 7,
    };

    const result = (order[(a ?? '').toLowerCase()] ?? 999) - (order[(b ?? '').toLowerCase()] ?? 999);
    return sens === 'ASC' ? result : -result;
  }

  private normalize(value: string): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private hasVmChanged(current: CoursPageVm | null, fresh: CoursPageVm): boolean {
    if (!current) return true;
    return this.computeFingerprint(current) !== this.computeFingerprint(fresh);
  }

  private computeFingerprint(vm: CoursPageVm): string {
    const refsPart = [
      (vm.refs.listeCours ?? []).map((x: any) => `${x.id}:${x.nom ?? ''}`).sort().join('|'),
      (vm.refs.listeGroupe ?? []).map((x: any) => `${x.id}:${x.nom ?? ''}`).sort().join('|'),
      (vm.refs.listeLieu ?? []).map((x: any) => `${x.key}:${x.value ?? ''}`).sort().join('|'),
      (vm.refs.listeProf ?? []).map((x: any) => `${x.key}:${x.value ?? ''}`).sort().join('|'),
      (vm.refs.listeSaison ?? []).map((x: any) => `${x.id}:${x.nom ?? ''}`).sort().join('|'),
    ].join('///');

    const listPart = (vm.list ?? [])
      .map((c: any) =>
        [
          c.id ?? '',
          c.nom ?? '',
          c.jour_semaine ?? '',
          c.heure ?? '',
          c.duree ?? '',
          c.prof_principal_id ?? '',
          c.lieu_id ?? '',
          (c.groupes ?? []).map((g: any) => g.id).sort().join(','),
        ].join(':')
      )
      .sort()
      .join('|');

    const saisonPart = `${this.extractSaisonId(vm.activeSaison) ?? ''}`;
    return [refsPart, listPart, saisonPart].join('§§§');
  }

  private computePendingCount(current: CoursPageVm | null, fresh: CoursPageVm): number {
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
}
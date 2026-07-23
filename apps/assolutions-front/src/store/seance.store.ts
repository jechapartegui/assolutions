import { Injectable, computed, signal } from '@angular/core';
import { KeyValuePair, ProfLight_VM, Seance_VM } from '@shared/index';

import { SeanceMapper } from '../mapper/seance.mapper';
import { CachedScreenStore } from './cached-screen.store';
import { SeanceFilterVm } from '../vm/seance-filter.vm';
import { SeancePageVm } from '../vm/seance-page.vm';
import { MenuStore } from './menu.store';
import { SeanceDataStore } from '../data-store/seance-data.store';
import { LieuDataStore } from '../data-store/lieu-data.store';
import { GroupeDataStore } from '../data-store/groupe-data.store';
import { CoursDataStore } from '../data-store/cours-data.store';
import { ContratProfDataStore } from '../data-store/contrat-prof-data.store';
import { SaisonApiService } from '../services/saison-api.service';

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
  private static readonly TTL_MS = 5 * 60 * 1000;

  private readonly state = signal<SeancePageVm>(createInitialVm());
  readonly vm = computed(() => this.state());

  private initPromise: Promise<void> | null = null;
  private silentRefreshPromise: Promise<void> | null = null;
  private hardRefreshPromise: Promise<void> | null = null;

  constructor(
    private readonly seanceDataStore: SeanceDataStore,
    private readonly mapper: SeanceMapper,
    private readonly menuStore: MenuStore,
    private readonly saisonService: SaisonApiService,
    private readonly lieuDataStore: LieuDataStore,
    private readonly groupeDataStore: GroupeDataStore,
    private readonly coursDataStore: CoursDataStore,
    private readonly contratProfDataStore: ContratProfDataStore,
  ) {
    super(SeanceStore.TTL_MS);
  }

  /**
   * Store écran : construit la page séance.
   * Source des séances : SeanceDataStore.
   * Source des refs : data stores objet.
   */
  async init(saisonId: number): Promise<void> {
    const current = this.state();
    const sameSaison = this.extractSaisonId(current.activeSaison) === saisonId;
    const pageAlreadyBuilt = sameSaison && this.hasCurrentCache(true);

    if (pageAlreadyBuilt && this.seanceDataStore.isFullLoadedFor(saisonId)) {
      this.rebuildListFromDataStore();

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
    this.patch({ loading: true, action: 'Chargement des séances' });

    try {
      const [, refsAndSaison] = await Promise.all([
        this.seanceDataStore.loadFull(saisonId),
        this.loadRefsAndActiveSaison(saisonId),
      ]);

      const nextVm: SeancePageVm = this.buildPageVmFromDataStore({
        base: this.state(),
        refsAndSaison,
        resetFilter: true,
        loading: false,
      });

      this.setCurrentData(nextVm);
      this.state.set({
        ...nextVm,
        lastLoadedAt: Date.now(),
        refreshAvailable: false,
        pendingCount: 0,
        action: '',
      });
    } catch (e) {
      this.patch({ loading: false, action: '' });
      throw new Error('Chargement de la page séance impossible');
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
      const [, refsAndSaison] = await Promise.all([
        this.seanceDataStore.loadFull(saisonId, { force: true }),
        this.loadRefsAndActiveSaison(saisonId, true),
      ]);

      const freshVm = this.buildPageVmFromDataStore({
        base: this.state(),
        refsAndSaison,
        resetFilter: false,
        loading: false,
      });

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
      // refresh silencieux : on ne casse pas l'écran courant
    }
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
    this.patch({ loading: true, action: 'Actualisation des séances' });

    try {
      const [, refsAndSaison] = await Promise.all([
        this.seanceDataStore.loadFull(saisonId, { force: true }),
        this.loadRefsAndActiveSaison(saisonId, true),
      ]);

      const nextVm = this.buildPageVmFromDataStore({
        base: this.state(),
        refsAndSaison,
        resetFilter: false,
        loading: false,
      });

      this.setCurrentData(nextVm);
      this.state.set({
        ...nextVm,
        lastLoadedAt: Date.now(),
        refreshAvailable: false,
        pendingCount: 0,
        action: '',
      });
    } catch {
      this.patch({ loading: false, action: '' });
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
    });
  }

  openSeance(id: number, saisonId: number): Promise<void> {
    return this.loadSeanceIntoEditor(id, saisonId);
  }

  private async loadSeanceIntoEditor(id: number, saisonId: number): Promise<void> {
    const seance = await this.seanceDataStore.getOrLoad(id, saisonId);
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
    const list = this.sortList(this.state().list ?? [], type, sens);

    this.patch({
      list,
      selectedSort: type,
      selectedSortSens: sens,
    });
  }

  toggleMultiSelectMode(): void {
    const vm = this.state();
    this.patch({
      multiSelectMode: !vm.multiSelectMode,
      selectedIds: !vm.multiSelectMode ? vm.selectedIds : [],
    });
  }

  toggleSelectedSeance(id: number): void {
    const current = this.state().selectedIds ?? [];
    const exists = current.includes(id);

    this.patch({
      selectedIds: exists ? current.filter((x) => x !== id) : [...current, id],
    });
  }

  clearSelection(): void {
    this.patch({
      selectedIds: [],
      multiSelectMode: false,
    });
  }

  async deleteSelectedSeances(): Promise<void> {
    const ids = [...(this.state().selectedIds ?? [])];
    if (!ids.length) return;

    this.patch({ action: 'Suppression des séances' });

    try {
      for (const id of ids) {
        await this.seanceDataStore.delete(id);
      }

      this.rebuildListFromDataStore();
      this.patch({
        selectedIds: [],
        multiSelectMode: false,
        action: '',
      });
      this.syncCurrentSnapshot();
    } catch (e) {
      this.patch({ action: '' });
      throw e;
    }
  }

  async duplicateCurrentSeance(): Promise<void> {
    const current = this.state().editSeance;
    const saisonId = this.state().activeSaison?.id ?? current?.saison_id ?? 0;
    if (!current || !saisonId) return;

    this.patch({ action: 'Duplication de la séance' });

    try {
      const saved = current.id > 0
        ? await this.saveExistingWithLinks(current, saisonId)
        : await this.createWithLinks(current, saisonId);

      const clone = this.cloneAsNew(saved);
      this.patch({
        editSeance: clone,
        isValid: true,
        action: '',
      });
    } catch (e) {
      this.patch({ action: '' });
      throw e;
    }
  }

  async saveEditedSeance(): Promise<Seance_VM> {
    const current = this.state().editSeance;
    const saisonId = this.state().activeSaison?.id ?? current?.saison_id ?? 0;

    if (!current) throw new Error('Aucune séance en cours d’édition');
    if (!saisonId) throw new Error('Saison active introuvable');

    this.patch({ action: 'Sauvegarde de la séance' });

    try {
      const saved = current.id > 0
        ? await this.saveExistingWithLinks(current, saisonId)
        : await this.createWithLinks(current, saisonId);

      this.menuStore.patchLocalSeance(saved);
      this.rebuildListFromDataStore(saved);

      this.patch({
        editSeance: saved,
        action: '',
      });

      this.syncCurrentSnapshot();
      return saved;
    } catch (e) {
      this.patch({ action: '' });
      throw e;
    }
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

  private async saveExistingWithLinks(seance: Seance_VM, saisonId: number): Promise<Seance_VM> {
    await this.seanceDataStore.update(seance, saisonId);
    await this.saveLinks(seance.id, seance, saisonId);
    return this.seanceDataStore.getOrLoad(seance.id, saisonId, { force: true });
  }

  private async createWithLinks(seance: Seance_VM, saisonId: number): Promise<Seance_VM> {
    const created = await this.seanceDataStore.create({ ...seance, saison_id: saisonId } as Seance_VM);
    await this.saveLinks(created.id, seance, saisonId);
    return this.seanceDataStore.getOrLoad(created.id, saisonId, { force: true });
  }

  private async saveLinks(seanceId: number, source: Seance_VM, saisonId: number): Promise<void> {
    await this.seanceDataStore.updateProfs(
      seanceId,
      (source.seanceProfesseurs ?? []) as any,
      saisonId,
    );

    const groupeIds = (source.groupes ?? [])
      .map((g: any) => g.groupe_id ?? g.id)
      .filter((id: number) => typeof id === 'number' && id > 0);

    await this.seanceDataStore.updateGroupes(seanceId, groupeIds, saisonId);
  }

  private async loadRefsAndActiveSaison(
    saisonId: number,
    force = false,
  ): Promise<Pick<SeancePageVm, 'refs' | 'activeSaison'>> {
    const [saisons, cours, groupes, lieux, profs] = await Promise.all([
      this.saisonService.list(),
      this.coursDataStore.loadBySaison(saisonId, { force }),
      this.groupeDataStore.loadBySaison(saisonId, { force }),
      this.lieuDataStore.loadAll({ force }),
      this.contratProfDataStore.loadProfLightsBySaison(saisonId, { force }),
    ]);

    const activeSaison =
      (saisons ?? []).find((x) => x.id === saisonId) ??
      (saisons ?? []).find((x) => x.active === true) ??
      (saisons ?? [])[0] ??
      null;

    const refs = this.mapper.buildReferencesVm(
      cours ?? [],
      groupes ?? [],
      this.toLieuFilter(lieux ?? []),
      this.toProfFilter(profs ?? []),
      saisons ?? [],
    );

    return { refs, activeSaison };
  }

  private toLieuFilter(lieux: any[]): KeyValuePair[] {
    return (lieux ?? []).map((x: any) => ({
      key: Number(x.id ?? x.lieu_id ?? 0),
      value: x.nom ?? x.label ?? '',
    }));
  }

  private toProfFilter(profs: ProfLight_VM[]): KeyValuePair[] {
    return (profs ?? [])
      .map((x: any) => ({
        // Les refs d'écran manipulent le contrat professeur.
        // Le ProfLight_VM garde id = personne et contrat_id = contrat.
        key: Number(x.contrat_id ?? x.contratId ?? 0),
        value: `${x.prenom ?? ''} ${x.nom ?? ''}`.trim(),
      }))
      .filter((x) => x.key > 0);
  }

  private buildPageVmFromDataStore(args: {
    base: SeancePageVm;
    refsAndSaison: Pick<SeancePageVm, 'refs' | 'activeSaison'>;
    resetFilter: boolean;
    loading: boolean;
  }): SeancePageVm {
    const base = args.base;
    const list = this.applyCurrentSort(this.seanceDataStore.list());

    return {
      ...base,
      refs: args.refsAndSaison.refs,
      activeSaison: args.refsAndSaison.activeSaison,
      list,
      loading: args.loading,
      filter: args.resetFilter ? this.mapper.createDefaultFilter() : base.filter,
      selectedFilter: base.selectedFilter,
      selectedSort: base.selectedSort,
      selectedSortSens: base.selectedSortSens,
      showFilterPanel: base.showFilterPanel,
      showSortPanel: base.showSortPanel,
      showScrollToTop: base.showScrollToTop,
      editSeance: base.editSeance,
      editModeSerie: base.editModeSerie,
      readonly: base.readonly,
      isValid: base.isValid,
      multiSelectMode: false,
      selectedIds: [],
      action: '',
    } as SeancePageVm;
  }

  private rebuildListFromDataStore(forceInclude?: Seance_VM): void {
    const source = this.seanceDataStore.list();
    const list = forceInclude
      ? this.upsertSeanceInList(source, forceInclude)
      : this.applyCurrentSort(source);

    this.patch({ list });
  }

  private cloneAsNew(source: Seance_VM): Seance_VM {
    const clone: Seance_VM = typeof structuredClone === 'function'
      ? structuredClone(source)
      : JSON.parse(JSON.stringify(source));

    clone.id = 0;
    return clone;
  }

  private upsertSeanceInList(list: Seance_VM[], saved: Seance_VM): Seance_VM[] {
    const exists = list.some((x) => x.id === saved.id);
    const next = exists ? list.map((x) => (x.id === saved.id ? saved : x)) : [...list, saved];
    return this.applyCurrentSort(next);
  }

  private applyCurrentSort(list: Seance_VM[]): Seance_VM[] {
    const vm = this.state();
    return this.sortList(list, vm.selectedSort, vm.selectedSortSens);
  }

  private sortList(
    list: Seance_VM[],
    type: 'nom' | 'date' | 'cours' | 'lieu',
    sens: 'ASC' | 'DESC',
  ): Seance_VM[] {
    switch (type) {
      case 'nom':
        return this.mapper.sortByNom([...list], sens);
      case 'cours':
        return this.mapper.sortByCours([...list], sens);
      case 'lieu':
        return this.mapper.sortByLieu([...list], sens);
      case 'date':
      default:
        return this.mapper.sortByDate([...list], sens);
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

  private hasVmChanged(current: SeancePageVm | null, fresh: SeancePageVm): boolean {
    if (!current) return true;
    return this.computeFingerprint(current) !== this.computeFingerprint(fresh);
  }

  private computeFingerprint(vm: SeancePageVm): string {
    const refsPart = [
      (vm.refs.listeCours ?? []).map((x: any) => `${x.id}:${x.nom ?? ''}`).sort().join('|'),
      (vm.refs.listeGroupe ?? []).map((x: any) => `${x.id}:${x.nom ?? ''}`).sort().join('|'),
      (vm.refs.listeLieu ?? []).map((x: any) => `${x.id}:${x.nom ?? ''}`).sort().join('|'),
      (vm.refs.listeProf ?? []).map((x: any) => `${x.id}:${x.contrat_id ?? x.contratId ?? ''}:${x.nom ?? ''}:${x.prenom ?? ''}`).sort().join('|'),
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

  private computePendingCount(current: SeancePageVm | null, fresh: SeancePageVm): number {
    if (!current) return fresh.list?.length ?? 0;

    const currentIds = new Set((current.list ?? []).map((x: any) => x.id));
    let count = 0;

    for (const item of fresh.list ?? []) {
      if (!currentIds.has((item as any).id)) count++;
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

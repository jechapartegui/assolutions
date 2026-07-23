import { computed, Injectable, signal } from '@angular/core';
import { Cours_VM } from '@shared/index';
import { CoursRepository } from '../repository/cours.repository';

export type CoursLoadMode = 'partial' | 'full';

interface CoursDataState {
  activeSaisonId: number | null;
  fullLoaded: boolean;
  loadedIds: Set<number>;
  loadModeById: Record<number, CoursLoadMode>;
  loading: boolean;
  error: string | null;
  lastLoadedAt: number | null;
}

@Injectable({ providedIn: 'root' })
export class CoursDataStore {
  private readonly entitiesSig = signal<Record<number, Cours_VM>>({});

  private readonly stateSig = signal<CoursDataState>({
    activeSaisonId: null,
    fullLoaded: false,
    loadedIds: new Set<number>(),
    loadModeById: {},
    loading: false,
    error: null,
    lastLoadedAt: null,
  });

  readonly entities = this.entitiesSig.asReadonly();
  readonly state = this.stateSig.asReadonly();

  readonly activeSaisonId = computed(() => this.stateSig().activeSaisonId);
  readonly loading = computed(() => this.stateSig().loading);
  readonly error = computed(() => this.stateSig().error);
  readonly fullLoaded = computed(() => this.stateSig().fullLoaded);
  readonly lastLoadedAt = computed(() => this.stateSig().lastLoadedAt);

  readonly list = computed(() =>
    Object.values(this.entitiesSig()).sort((a, b) => this.compareCours(a, b)),
  );

  private loadFullPromise: Promise<Cours_VM[]> | null = null;
  private loadFullPromiseSaisonId: number | null = null;

  constructor(private readonly repository: CoursRepository) {}

  byId(id: number): Cours_VM | null {
    return this.entitiesSig()[Number(id)] ?? null;
  }

  has(id: number): boolean {
    return !!this.byId(id);
  }

  isFullLoadedFor(saisonId: number): boolean {
    const state = this.stateSig();
    return state.activeSaisonId === Number(saisonId) && state.fullLoaded;
  }

  async loadBySaison(saisonId: number, options: { force?: boolean } = {}): Promise<Cours_VM[]> {
    const normalizedSaisonId = Number(saisonId);
    if (!normalizedSaisonId) return [];

    this.ensureSaison(normalizedSaisonId);

    if (!options.force && this.isFullLoadedFor(normalizedSaisonId)) {
      return this.list();
    }

    if (
      this.loadFullPromise &&
      !options.force &&
      this.loadFullPromiseSaisonId === normalizedSaisonId
    ) {
      return this.loadFullPromise;
    }

    this.loadFullPromiseSaisonId = normalizedSaisonId;
    this.loadFullPromise = this.doLoadBySaison(normalizedSaisonId, options);

    try {
      return await this.loadFullPromise;
    } finally {
      this.loadFullPromise = null;
      this.loadFullPromiseSaisonId = null;
    }
  }

  async refresh(saisonId = this.stateSig().activeSaisonId ?? 0): Promise<Cours_VM[]> {
    return this.loadBySaison(saisonId, { force: true });
  }

  /**
   * Chargement partiel : utile si un écran n'a besoin que de quelques cours.
   * L'API actuelle n'a pas de endpoint batch par ids, donc on charge les détails un par un.
   */
  async loadPartialByIds(
    ids: number[],
    saisonId: number,
    options: { force?: boolean } = {},
  ): Promise<Cours_VM[]> {
    const normalizedSaisonId = Number(saisonId);
    this.ensureSaison(normalizedSaisonId);

    const cleanIds = this.cleanIds(ids);
    if (!cleanIds.length) return [];

    const idsToLoad = options.force
      ? cleanIds
      : cleanIds.filter((id) => !this.has(id));

    if (!idsToLoad.length) {
      return cleanIds.map((id) => this.byId(id)).filter((x): x is Cours_VM => !!x);
    }

    this.setLoading(true);
    try {
      const loaded = await Promise.all(
        idsToLoad.map((id) => this.repository.loadCoursById(id, normalizedSaisonId, options)),
      );
      this.upsertMany(loaded, 'partial', normalizedSaisonId);
      return cleanIds.map((id) => this.byId(id)).filter((x): x is Cours_VM => !!x);
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async getOrLoad(
    id: number,
    saisonId: number,
    options: { force?: boolean } = {},
  ): Promise<Cours_VM> {
    const normalizedSaisonId = Number(saisonId);
    const normalizedId = Number(id);
    this.ensureSaison(normalizedSaisonId);

    const cached = this.byId(normalizedId);
    if (cached && !options.force) return cached;

    this.setLoading(true);
    try {
      const cours = await this.repository.loadCoursById(normalizedId, normalizedSaisonId, options);
      this.upsertOne(cours, 'partial', normalizedSaisonId);
      return cours;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async create(cours: Cours_VM, saisonId = cours.saison_id): Promise<Cours_VM> {
    const normalizedSaisonId = Number(saisonId);
    this.ensureSaison(normalizedSaisonId);

    this.setLoading(true);
    try {
      const created = await this.repository.createCours(cours);
      const enriched = await this.repository.loadCoursById(created.id, normalizedSaisonId, { force: true });
      this.upsertOne(enriched, 'partial', normalizedSaisonId);
      return enriched;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async update(cours: Cours_VM, saisonId = cours.saison_id): Promise<Cours_VM> {
    const normalizedSaisonId = Number(saisonId);
    this.ensureSaison(normalizedSaisonId);

    this.setLoading(true);
    try {
      const updated = await this.repository.updateCours(cours);
      const enriched = await this.repository.loadCoursById(updated.id, normalizedSaisonId, { force: true });
      this.upsertOne(enriched, 'partial', normalizedSaisonId);
      return enriched;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async delete(id: number, saisonId = this.stateSig().activeSaisonId ?? 0): Promise<void> {
    this.setLoading(true);
    try {
      await this.repository.deleteCours(Number(id), Number(saisonId));
      this.removeLocal(Number(id));
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async updateSerie(cours: Cours_VM, fromDate: Date): Promise<void> {
    this.setLoading(true);
    try {
      await this.repository.updateSerieCours(cours, fromDate);
      this.invalidateFull();
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async updateCoursProfs(
    coursId: number,
    profs: any[],
    saisonId = this.stateSig().activeSaisonId ?? 0,
  ): Promise<Cours_VM | null> {
    this.setLoading(true);
    try {
      await this.repository.updateCoursProfs(Number(coursId), profs, Number(saisonId));
      const refreshed = await this.repository.loadCoursById(Number(coursId), Number(saisonId), { force: true });
      this.upsertOne(refreshed, 'partial', Number(saisonId));
      return refreshed;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async updateCoursGroupes(
    coursId: number,
    groupeIds: number[],
    saisonId = this.stateSig().activeSaisonId ?? 0,
  ): Promise<Cours_VM | null> {
    this.setLoading(true);
    try {
      await this.repository.updateCoursGroupes(Number(coursId), groupeIds);
      const refreshed = await this.repository.loadCoursById(Number(coursId), Number(saisonId), { force: true });
      this.upsertOne(refreshed, 'partial', Number(saisonId));
      return refreshed;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  upsertOne(
    cours: Cours_VM,
    mode: CoursLoadMode = 'partial',
    saisonId = this.stateSig().activeSaisonId ?? cours.saison_id,
  ): void {
    if (!cours?.id) return;
    this.ensureSaison(Number(saisonId || cours.saison_id || 0));

    this.entitiesSig.update((entities) => ({
      ...entities,
      [Number(cours.id)]: cours,
    }));

    this.stateSig.update((s) => ({
      ...s,
      loadedIds: new Set([...s.loadedIds, Number(cours.id)]),
      loadModeById: {
        ...s.loadModeById,
        [Number(cours.id)]: mode,
      },
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  upsertMany(cours: Cours_VM[], mode: CoursLoadMode, saisonId = this.stateSig().activeSaisonId ?? 0): void {
    for (const item of cours ?? []) {
      this.upsertOne(item, mode, saisonId || item.saison_id);
    }
  }

  removeLocal(id: number): void {
    const normalizedId = Number(id);
    const { [normalizedId]: _, ...rest } = this.entitiesSig();
    const loadedIds = new Set(this.stateSig().loadedIds);
    loadedIds.delete(normalizedId);

    const { [normalizedId]: __, ...loadModeById } = this.stateSig().loadModeById;

    this.entitiesSig.set(rest);
    this.stateSig.update((s) => ({
      ...s,
      loadedIds,
      loadModeById,
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  invalidateFull(): void {
    this.stateSig.update((s) => ({ ...s, fullLoaded: false }));
  }

  clear(): void {
    this.entitiesSig.set({});
    this.stateSig.set({
      activeSaisonId: null,
      fullLoaded: false,
      loadedIds: new Set<number>(),
      loadModeById: {},
      loading: false,
      error: null,
      lastLoadedAt: null,
    });
    this.loadFullPromise = null;
    this.loadFullPromiseSaisonId = null;
  }

  private async doLoadBySaison(saisonId: number, options: { force?: boolean }): Promise<Cours_VM[]> {
    this.setLoading(true);
    try {
      const cours = await this.repository.loadCours(saisonId, options);
      this.replaceAll(cours, saisonId);
      return this.list();
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  private replaceAll(cours: Cours_VM[], saisonId: number): void {
    const next: Record<number, Cours_VM> = {};
    const loadedIds = new Set<number>();
    const loadModeById: Record<number, CoursLoadMode> = {};

    for (const item of cours ?? []) {
      if (!item?.id) continue;
      next[Number(item.id)] = item;
      loadedIds.add(Number(item.id));
      loadModeById[Number(item.id)] = 'full';
    }

    this.entitiesSig.set(next);
    this.stateSig.update((s) => ({
      ...s,
      activeSaisonId: saisonId,
      fullLoaded: true,
      loadedIds,
      loadModeById,
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  private ensureSaison(saisonId: number): void {
    if (!saisonId) return;

    const current = this.stateSig().activeSaisonId;
    if (current === null || current === saisonId) {
      this.stateSig.update((s) => ({ ...s, activeSaisonId: saisonId }));
      return;
    }

    this.entitiesSig.set({});
    this.stateSig.set({
      activeSaisonId: saisonId,
      fullLoaded: false,
      loadedIds: new Set<number>(),
      loadModeById: {},
      loading: false,
      error: null,
      lastLoadedAt: null,
    });
  }

  private cleanIds(ids: number[]): number[] {
    return [
      ...new Set(
        (ids ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];
  }

  private setLoading(loading: boolean): void {
    this.stateSig.update((s) => ({ ...s, loading }));
  }

  private setError(e: unknown): void {
    const message = e instanceof Error ? e.message : 'Erreur lors du chargement des cours';
    this.stateSig.update((s) => ({ ...s, error: message }));
  }

  private compareCours(a: Cours_VM, b: Cours_VM): number {
    const jourDiff = this.jourIndex(a.jour_semaine) - this.jourIndex(b.jour_semaine);
    if (jourDiff !== 0) return jourDiff;

    const heureDiff = String(a.heure ?? '').localeCompare(String(b.heure ?? ''), 'fr');
    if (heureDiff !== 0) return heureDiff;

    return String(a.nom ?? '').localeCompare(String(b.nom ?? ''), 'fr', { sensitivity: 'base' });
  }

  private jourIndex(jour: string | null | undefined): number {
    const order: Record<string, number> = {
      lundi: 1,
      mardi: 2,
      mercredi: 3,
      jeudi: 4,
      vendredi: 5,
      samedi: 6,
      dimanche: 7,
    };
    return order[(jour ?? '').toLowerCase()] ?? 999;
  }
}

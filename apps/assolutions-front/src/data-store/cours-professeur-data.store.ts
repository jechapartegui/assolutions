import { computed, Injectable, signal } from '@angular/core';
import {
  CoursProfesseur,
  CreateCoursProfesseurDto,
  UpdateCoursProfesseurDto,
} from '@shared/lib/cours-professeur.inteface';
import { CoursProfesseurApiService } from '../services/cours-professeur-api.service';

interface CoursProfesseurDataState {
  /**
   * Cours-professeur est surtout utilisé comme table de liens.
   * Il n'y a pas de chargement complet par saison dans l'API actuelle : on charge par cours.
   */
  loadedCoursIds: Set<number>;
  loading: boolean;
  error: string | null;
  lastLoadedAt: number | null;
}

@Injectable({ providedIn: 'root' })
export class CoursProfesseurDataStore {
  private readonly entitiesSig = signal<Record<number, CoursProfesseur>>({});
  private readonly contratsByCoursIdSig = signal<Record<number, number[]>>({});

  private readonly stateSig = signal<CoursProfesseurDataState>({
    loadedCoursIds: new Set<number>(),
    loading: false,
    error: null,
    lastLoadedAt: null,
  });

  readonly entities = this.entitiesSig.asReadonly();
  readonly contratsByCoursId = this.contratsByCoursIdSig.asReadonly();
  readonly state = this.stateSig.asReadonly();

  readonly loading = computed(() => this.stateSig().loading);
  readonly error = computed(() => this.stateSig().error);
  readonly loadedCoursIds = computed(() => this.stateSig().loadedCoursIds);
  readonly lastLoadedAt = computed(() => this.stateSig().lastLoadedAt);

  readonly list = computed(() => Object.values(this.entitiesSig()));

  private loadPromiseByKey: Record<string, Promise<Record<number, number[]>>> = {};

  constructor(private readonly api: CoursProfesseurApiService) {}

  byId(id: number): CoursProfesseur | null {
    return this.entitiesSig()[Number(id)] ?? null;
  }

  contratsForCours(coursId: number): number[] {
    return this.contratsByCoursIdSig()[Number(coursId)] ?? [];
  }

  hasCoursLoaded(coursId: number): boolean {
    return this.stateSig().loadedCoursIds.has(Number(coursId));
  }

  /**
   * Charge les contrats professeurs liés à une liste de cours.
   * Les cours déjà chargés ne rappellent pas le back sauf force=true.
   */
  async loadByCoursIds(
    coursIds: number[],
    options: { force?: boolean } = {},
  ): Promise<Record<number, number[]>> {
    const ids = this.cleanIds(coursIds);
    if (!ids.length) return {};

    const idsToLoad = options.force
      ? ids
      : ids.filter((id) => !this.hasCoursLoaded(id));

    if (!idsToLoad.length) {
      return this.pickContratsByCours(ids);
    }

    const key = idsToLoad.join(',');
    if (this.loadPromiseByKey[key] && !options.force) {
      await this.loadPromiseByKey[key];
      return this.pickContratsByCours(ids);
    }

    this.loadPromiseByKey[key] = this.doLoadByCoursIds(idsToLoad);

    try {
      await this.loadPromiseByKey[key];
      return this.pickContratsByCours(ids);
    } finally {
      delete this.loadPromiseByKey[key];
    }
  }

  async refreshByCoursIds(coursIds: number[]): Promise<Record<number, number[]>> {
    return this.loadByCoursIds(coursIds, { force: true });
  }

  async create(dto: CreateCoursProfesseurDto): Promise<CoursProfesseur> {
    this.setLoading(true);
    try {
      const created = await this.api.create(dto);
      this.upsertOne(created);
      this.invalidateCours(this.coursIdOf(created));
      return created;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async update(id: number, dto: UpdateCoursProfesseurDto): Promise<CoursProfesseur> {
    this.setLoading(true);
    try {
      const updated = await this.api.update(Number(id), dto);
      this.upsertOne(updated);
      this.invalidateCours(this.coursIdOf(updated));
      return updated;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async delete(id: number): Promise<void> {
    const existing = this.byId(Number(id));

    this.setLoading(true);
    try {
      await this.api.remove(Number(id));
      this.removeLocal(Number(id));
      this.invalidateCours(this.coursIdOf(existing));
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Remplace toute la liste des professeurs d'un cours.
   * profs = ids de contrat professeur, pas ids personne.
   */
  async updateList(coursId: number, profs: number[], saisonId: number): Promise<void> {
    const normalizedCoursId = Number(coursId);
    const contratIds = this.cleanIds(profs);

    this.setLoading(true);
    try {
      await this.api.updatelist(normalizedCoursId, contratIds, Number(saisonId));
      this.contratsByCoursIdSig.update((current) => ({
        ...current,
        [normalizedCoursId]: contratIds,
      }));
      this.stateSig.update((s) => ({
        ...s,
        loadedCoursIds: new Set([...s.loadedCoursIds, normalizedCoursId]),
        error: null,
        lastLoadedAt: Date.now(),
      }));
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  upsertOne(item: CoursProfesseur): void {
    const id = this.idOf(item);
    if (!id) return;

    this.entitiesSig.update((entities) => ({
      ...entities,
      [id]: item,
    }));

    this.stateSig.update((s) => ({ ...s, error: null, lastLoadedAt: Date.now() }));
  }

  removeLocal(id: number): void {
    const { [Number(id)]: _, ...rest } = this.entitiesSig();
    this.entitiesSig.set(rest);
    this.stateSig.update((s) => ({ ...s, error: null, lastLoadedAt: Date.now() }));
  }

  invalidateCours(coursId: number | null | undefined): void {
    const normalizedCoursId = Number(coursId);
    if (!normalizedCoursId) return;

    const { [normalizedCoursId]: _, ...rest } = this.contratsByCoursIdSig();
    this.contratsByCoursIdSig.set(rest);

    const loadedCoursIds = new Set(this.stateSig().loadedCoursIds);
    loadedCoursIds.delete(normalizedCoursId);

    this.stateSig.update((s) => ({ ...s, loadedCoursIds }));
  }

  clear(): void {
    this.entitiesSig.set({});
    this.contratsByCoursIdSig.set({});
    this.stateSig.set({
      loadedCoursIds: new Set<number>(),
      loading: false,
      error: null,
      lastLoadedAt: null,
    });
    this.loadPromiseByKey = {};
  }

  private async doLoadByCoursIds(coursIds: number[]): Promise<Record<number, number[]>> {
    this.setLoading(true);
    try {
      const result = await this.api.listProfsByCoursId(coursIds);
      const normalized = this.normalizeContratsByCours(result, coursIds);

      this.contratsByCoursIdSig.update((current) => ({
        ...current,
        ...normalized,
      }));

      this.stateSig.update((s) => ({
        ...s,
        loadedCoursIds: new Set([...s.loadedCoursIds, ...coursIds]),
        error: null,
        lastLoadedAt: Date.now(),
      }));

      return normalized;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  private normalizeContratsByCours(
    result: Record<number, number[]> | null | undefined,
    requestedIds: number[],
  ): Record<number, number[]> {
    const next: Record<number, number[]> = {};

    for (const coursId of requestedIds) {
      next[coursId] = this.cleanIds((result ?? {})[coursId] ?? []);
    }

    return next;
  }

  private pickContratsByCours(coursIds: number[]): Record<number, number[]> {
    const current = this.contratsByCoursIdSig();
    return Object.fromEntries(coursIds.map((id) => [id, current[id] ?? []]));
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

  private idOf(item: CoursProfesseur | null | undefined): number {
    const raw = item as any;
    const normalized = Number(raw?.id ?? raw?.cours_professeur_id ?? raw?.coursProfesseurId);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
  }

  private coursIdOf(item: CoursProfesseur | null | undefined): number | null {
    const raw = item as any;
    const normalized = Number(raw?.cours_id ?? raw?.coursId ?? raw?.cours?.id);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
  }

  private setLoading(loading: boolean): void {
    this.stateSig.update((s) => ({ ...s, loading }));
  }

  private setError(e: unknown): void {
    const message = e instanceof Error ? e.message : 'Erreur lors du chargement des professeurs de cours';
    this.stateSig.update((s) => ({ ...s, error: message }));
  }
}

import { computed, Injectable, signal } from '@angular/core';
import {
  CreatePersonneDto,
  Personne,
  UpdatePersonneDto,
} from '@shared/lib/personne.interface';
import { PersonneRepository } from '../repository/personne.repository';

type PersonneLoadMode = 'partial' | 'full';

interface PersonneDataState {
  fullLoaded: boolean;
  loadedIds: Set<number>;
  photoLoadedIds: Set<number>;
  loadModeById: Record<number, PersonneLoadMode>;
  loading: boolean;
  error: string | null;
  lastLoadedAt: number | null;
}

@Injectable({ providedIn: 'root' })
export class PersonneDataStore {
  private readonly entitiesSig = signal<Record<number, Personne>>({});
  private readonly photosByIdSig = signal<Record<number, string | null>>({});

  private readonly stateSig = signal<PersonneDataState>({
    fullLoaded: false,
    loadedIds: new Set<number>(),
    photoLoadedIds: new Set<number>(),
    loadModeById: {},
    loading: false,
    error: null,
    lastLoadedAt: null,
  });

  readonly entities = this.entitiesSig.asReadonly();
  readonly photosById = this.photosByIdSig.asReadonly();
  readonly state = this.stateSig.asReadonly();

  readonly loading = computed(() => this.stateSig().loading);
  readonly error = computed(() => this.stateSig().error);
  readonly fullLoaded = computed(() => this.stateSig().fullLoaded);
  readonly lastLoadedAt = computed(() => this.stateSig().lastLoadedAt);

  readonly list = computed(() =>
    Object.values(this.entitiesSig()).sort((a, b) =>
      (a.last_name ?? '').localeCompare(b.last_name ?? '', 'fr', { sensitivity: 'base' }),
    ),
  );

  private fullLoadPromise: Promise<Personne[]> | null = null;
  private partialLoadPromiseByKey = new Map<string, Promise<Personne[]>>();

  constructor(private readonly repository: PersonneRepository) {}

  byId(id: number): Personne | null {
    return this.entitiesSig()[Number(id)] ?? null;
  }

  photoById(id: number): string | null {
    return this.photosByIdSig()[Number(id)] ?? null;
  }

  has(id: number): boolean {
    return !!this.byId(Number(id));
  }

  hasPhotoLoaded(id: number): boolean {
    return this.stateSig().photoLoadedIds.has(Number(id));
  }

  async loadAll(options: { force?: boolean; includePhotos?: boolean } = {}): Promise<Personne[]> {
    if (!options.force && this.stateSig().fullLoaded) {
      if (options.includePhotos) await this.ensurePhotosLoaded(this.list().map((p) => p.id));
      return this.list();
    }

    if (this.fullLoadPromise && !options.force) return this.fullLoadPromise;

    this.fullLoadPromise = this.doLoadAll(options);
    try {
      return await this.fullLoadPromise;
    } finally {
      this.fullLoadPromise = null;
    }
  }

  async loadPartialByIds(
    ids: number[],
    options: { force?: boolean; includePhotos?: boolean } = {},
  ): Promise<Personne[]> {
    const cleanIds = this.cleanIds(ids);
    if (!cleanIds.length) return [];

    const missingIds = options.force
      ? cleanIds
      : cleanIds.filter((id) => !this.has(id));

    const key = missingIds.join(',');

    if (missingIds.length) {
      const existingPromise = this.partialLoadPromiseByKey.get(key);
      if (existingPromise && !options.force) {
        await existingPromise;
      } else {
        const promise = this.doLoadPartialByIds(missingIds);
        this.partialLoadPromiseByKey.set(key, promise);
        try {
          await promise;
        } finally {
          this.partialLoadPromiseByKey.delete(key);
        }
      }
    }

    if (options.includePhotos) {
      await this.ensurePhotosLoaded(cleanIds, { force: options.force });
    }

    return cleanIds.map((id) => this.byId(id)).filter((x): x is Personne => !!x);
  }

  async getOrLoad(
    id: number,
    options: { force?: boolean; includePhoto?: boolean } = {},
  ): Promise<Personne> {
    const normalizedId = Number(id);
    const cached = this.byId(normalizedId);

    if (cached && !options.force) {
      if (options.includePhoto) await this.ensurePhotosLoaded([normalizedId]);
      return cached;
    }

    this.setLoading(true);
    try {
      const personne = await this.repository.get(normalizedId);
      this.upsertOne(personne, 'partial');
      if (options.includePhoto) await this.ensurePhotosLoaded([normalizedId], { force: options.force });
      return personne;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async create(dto: CreatePersonneDto, options: { photo?: string | null } = {}): Promise<Personne> {
    this.setLoading(true);
    try {
      const created = await this.repository.create(dto);
      this.upsertOne(created, 'partial');
      if ('photo' in options) {
        const photo = await this.repository.setPhoto(created.id, options.photo ?? null);
        this.upsertPhoto(created.id, photo);
      }
      return created;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async update(id: number, dto: UpdatePersonneDto, options: { photo?: string | null } = {}): Promise<Personne> {
    this.setLoading(true);
    try {
      const updated = await this.repository.update(Number(id), dto);
      this.upsertOne(updated, 'partial');
      if ('photo' in options) {
        const photo = await this.repository.setPhoto(Number(id), options.photo ?? null);
        this.upsertPhoto(Number(id), photo);
      }
      return updated;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async delete(id: number): Promise<void> {
    const normalizedId = Number(id);
    this.setLoading(true);
    try {
      await this.repository.remove(normalizedId);
      this.removeLocal(normalizedId);
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async ensurePhotosLoaded(ids: number[], options: { force?: boolean } = {}): Promise<Record<number, string | null>> {
    const cleanIds = this.cleanIds(ids);
    const missingIds = options.force
      ? cleanIds
      : cleanIds.filter((id) => !this.hasPhotoLoaded(id));

    if (!missingIds.length) return this.photosByIdSig();

    this.setLoading(true);
    try {
      const photos = await this.repository.loadPhotosByIds(missingIds);
      this.upsertPhotos(photos);
      return this.photosByIdSig();
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  upsertOne(personne: Personne, mode: PersonneLoadMode = 'partial'): void {
    if (!personne?.id) return;

    const id = Number(personne.id);
    this.entitiesSig.update((entities) => ({ ...entities, [id]: personne }));

    this.stateSig.update((s) => ({
      ...s,
      loadedIds: new Set([...s.loadedIds, id]),
      loadModeById: { ...s.loadModeById, [id]: mode },
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  upsertMany(personnes: Personne[], mode: PersonneLoadMode = 'partial'): void {
    const next = { ...this.entitiesSig() };
    const loadedIds = new Set(this.stateSig().loadedIds);
    const loadModeById = { ...this.stateSig().loadModeById };

    for (const personne of personnes ?? []) {
      if (!personne?.id) continue;
      const id = Number(personne.id);
      next[id] = personne;
      loadedIds.add(id);
      loadModeById[id] = mode;
    }

    this.entitiesSig.set(next);
    this.stateSig.update((s) => ({
      ...s,
      loadedIds,
      loadModeById,
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  upsertPhoto(personneId: number, photo: string | null): void {
    const id = Number(personneId);
    this.photosByIdSig.update((photos) => ({ ...photos, [id]: photo ?? null }));
    this.stateSig.update((s) => ({
      ...s,
      photoLoadedIds: new Set([...s.photoLoadedIds, id]),
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  upsertPhotos(photos: Record<number, string | null>): void {
    const next = { ...this.photosByIdSig() };
    const photoLoadedIds = new Set(this.stateSig().photoLoadedIds);

    for (const [rawId, photo] of Object.entries(photos ?? {})) {
      const id = Number(rawId);
      if (!Number.isFinite(id) || id <= 0) continue;
      next[id] = photo ?? null;
      photoLoadedIds.add(id);
    }

    this.photosByIdSig.set(next);
    this.stateSig.update((s) => ({
      ...s,
      photoLoadedIds,
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  removeLocal(id: number): void {
    const normalizedId = Number(id);
    const { [normalizedId]: _, ...restEntities } = this.entitiesSig();
    const { [normalizedId]: __, ...restPhotos } = this.photosByIdSig();

    const loadedIds = new Set(this.stateSig().loadedIds);
    const photoLoadedIds = new Set(this.stateSig().photoLoadedIds);
    loadedIds.delete(normalizedId);
    photoLoadedIds.delete(normalizedId);

    const { [normalizedId]: ___, ...loadModeById } = this.stateSig().loadModeById;

    this.entitiesSig.set(restEntities);
    this.photosByIdSig.set(restPhotos);
    this.stateSig.update((s) => ({
      ...s,
      loadedIds,
      photoLoadedIds,
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
    this.photosByIdSig.set({});
    this.stateSig.set({
      fullLoaded: false,
      loadedIds: new Set<number>(),
      photoLoadedIds: new Set<number>(),
      loadModeById: {},
      loading: false,
      error: null,
      lastLoadedAt: null,
    });
    this.fullLoadPromise = null;
    this.partialLoadPromiseByKey.clear();
  }

  private async doLoadAll(options: { includePhotos?: boolean } = {}): Promise<Personne[]> {
    this.setLoading(true);
    try {
      const personnes = await this.repository.listMine();
      this.replaceAll(personnes);
      if (options.includePhotos) await this.ensurePhotosLoaded(personnes.map((p) => p.id));
      return this.list();
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  private async doLoadPartialByIds(ids: number[]): Promise<Personne[]> {
    this.setLoading(true);
    try {
      const personnes = await this.repository.listByIds(ids);
      this.upsertMany(personnes, 'partial');
      return personnes;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  private replaceAll(personnes: Personne[]): void {
    const next: Record<number, Personne> = {};
    const loadedIds = new Set<number>();
    const loadModeById: Record<number, PersonneLoadMode> = {};

    for (const personne of personnes ?? []) {
      if (!personne?.id) continue;
      const id = Number(personne.id);
      next[id] = personne;
      loadedIds.add(id);
      loadModeById[id] = 'full';
    }

    this.entitiesSig.set(next);
    this.stateSig.update((s) => ({
      ...s,
      fullLoaded: true,
      loadedIds,
      loadModeById,
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  private setLoading(loading: boolean): void {
    this.stateSig.update((s) => ({ ...s, loading }));
  }

  private setError(e: unknown): void {
    this.stateSig.update((s) => ({
      ...s,
      error: e instanceof Error ? e.message : 'Erreur inconnue',
    }));
  }

  private cleanIds(ids: number[]): number[] {
    return [...new Set((ids ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0))];
  }
}

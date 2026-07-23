import { computed, Injectable, signal } from '@angular/core';
import { Lieu_VM } from '@shared/lib/lieu.interface';
import { LieuRepository } from '../repository/lieu.repository';

interface LieuDataState {
  /** true quand la liste complète des lieux a été chargée au moins une fois */
  fullLoaded: boolean;
  loading: boolean;
  error: string | null;
  lastLoadedAt: number | null;
}

@Injectable({ providedIn: 'root' })
export class LieuDataStore {
  private readonly entitiesSig = signal<Record<number, Lieu_VM>>({});

  private readonly stateSig = signal<LieuDataState>({
    fullLoaded: false,
    loading: false,
    error: null,
    lastLoadedAt: null,
  });

  readonly entities = this.entitiesSig.asReadonly();
  readonly state = this.stateSig.asReadonly();

  readonly loading = computed(() => this.stateSig().loading);
  readonly error = computed(() => this.stateSig().error);
  readonly fullLoaded = computed(() => this.stateSig().fullLoaded);
  readonly lastLoadedAt = computed(() => this.stateSig().lastLoadedAt);

  readonly list = computed(() =>
    Object.values(this.entitiesSig()).sort((a, b) =>
      (a.nom ?? '').localeCompare(b.nom ?? '', 'fr', { sensitivity: 'base' }),
    ),
  );

  private loadPromise: Promise<Lieu_VM[]> | null = null;

  constructor(private readonly repository: LieuRepository) {}

  byId(id: number): Lieu_VM | null {
    return this.entitiesSig()[id] ?? null;
  }

  has(id: number): boolean {
    return !!this.entitiesSig()[id];
  }

  /**
   * Chargement complet des lieux.
   * Lieu n'est pas lié à une saison et on ne prévoit pas de chargement partiel ici.
   */
  async loadAll(options: { force?: boolean } = {}): Promise<Lieu_VM[]> {
    if (!options.force && this.stateSig().fullLoaded) {
      return this.list();
    }

    if (this.loadPromise && !options.force) {
      return this.loadPromise;
    }

    this.loadPromise = this.doLoadAll();

    try {
      return await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  async refresh(): Promise<Lieu_VM[]> {
    return this.loadAll({ force: true });
  }

  /**
   * Détail : si la liste complète est déjà là, on sert le cache.
   * Sinon on peut charger le détail seul, puis l'ajouter au store.
   */
  async getOrLoad(id: number, options: { force?: boolean } = {}): Promise<Lieu_VM> {
    const cached = this.byId(id);
    if (cached && !options.force) return cached;

    this.setLoading(true);
    try {
      const item = await this.repository.loadLieuById(id);
      this.upsertOne(item);
      return item;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async create(lieu: Lieu_VM): Promise<Lieu_VM> {
    this.setLoading(true);
    try {
      const created = await this.repository.createLieu(lieu);
      this.upsertOne(created);
      return created;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async update(lieu: Lieu_VM): Promise<Lieu_VM> {
    this.setLoading(true);
    try {
      const updated = await this.repository.updateLieu(lieu);
      this.upsertOne(updated);
      return updated;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async delete(id: number): Promise<void> {
    this.setLoading(true);
    try {
      await this.repository.deleteLieu(id);
      this.removeLocal(id);
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Recherche back optionnelle.
   * On ajoute les résultats au cache, mais ça ne veut pas dire que la liste complète est chargée.
   */
  async search(search: string): Promise<Lieu_VM[]> {
    const query = (search ?? '').trim();
    if (!query) return this.loadAll();

    this.setLoading(true);
    try {
      const items = await this.repository.searchLieux(query);
      this.upsertMany(items);
      return items;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  /** Vide tout le store, utile au logout ou changement projet. */
  clear(): void {
    this.entitiesSig.set({});
    this.stateSig.set({
      fullLoaded: false,
      loading: false,
      error: null,
      lastLoadedAt: null,
    });
    this.loadPromise = null;
  }

  /** Marque le chargement complet comme périmé sans jeter les données déjà utiles à l'écran. */
  invalidateFull(): void {
    this.stateSig.update((s) => ({ ...s, fullLoaded: false }));
  }

  private async doLoadAll(): Promise<Lieu_VM[]> {
    this.setLoading(true);
    try {
      const lieux = await this.repository.loadLieux();
      this.replaceAll(lieux);
      return this.list();
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  private replaceAll(lieux: Lieu_VM[]): void {
    const next: Record<number, Lieu_VM> = {};

    for (const lieu of lieux ?? []) {
      if (!lieu?.id) continue;
      next[lieu.id] = lieu;
    }

    this.entitiesSig.set(next);
    this.stateSig.update((s) => ({
      ...s,
      fullLoaded: true,
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  private upsertMany(lieux: Lieu_VM[]): void {
    const next = { ...this.entitiesSig() };

    for (const lieu of lieux ?? []) {
      if (!lieu?.id) continue;
      next[lieu.id] = lieu;
    }

    this.entitiesSig.set(next);
    this.stateSig.update((s) => ({
      ...s,
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  private upsertOne(lieu: Lieu_VM): void {
    this.upsertMany([lieu]);
  }

  private removeLocal(id: number): void {
    const { [id]: _, ...rest } = this.entitiesSig();
    this.entitiesSig.set(rest);
    this.stateSig.update((s) => ({ ...s, error: null, lastLoadedAt: Date.now() }));
  }

  private setLoading(loading: boolean): void {
    this.stateSig.update((s) => ({ ...s, loading }));
  }

  private setError(e: unknown): void {
    const message = e instanceof Error ? e.message : 'Erreur lors du chargement des lieux';
    this.stateSig.update((s) => ({ ...s, error: message }));
  }
}

import { computed, Injectable, signal } from '@angular/core';
import { Groupe } from '@shared/index';
import { GroupeRepository } from '../repository/groupe.repository';

interface GroupeDataState {
  /** Saison actuellement représentée dans le store. */
  activeSaisonId: number | null;

  /** true quand la liste complète des groupes de la saison active a été chargée. */
  fullLoaded: boolean;

  loading: boolean;
  error: string | null;
  lastLoadedAt: number | null;
}

@Injectable({ providedIn: 'root' })
export class GroupeDataStore {
  private readonly entitiesSig = signal<Record<number, Groupe>>({});

  private readonly stateSig = signal<GroupeDataState>({
    activeSaisonId: null,
    fullLoaded: false,
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
    Object.values(this.entitiesSig()).sort((a, b) =>
      (a.nom ?? '').localeCompare(b.nom ?? '', 'fr', { sensitivity: 'base' }),
    ),
  );

  private loadPromise: Promise<Groupe[]> | null = null;
  private loadPromiseSaisonId: number | null = null;

  constructor(private readonly repository: GroupeRepository) {}

  byId(id: number): Groupe | null {
    return this.entitiesSig()[Number(id)] ?? null;
  }

  has(id: number): boolean {
    return !!this.byId(id);
  }

  isFullLoadedFor(saisonId: number): boolean {
    const state = this.stateSig();
    return state.activeSaisonId === Number(saisonId) && state.fullLoaded;
  }

  /**
   * Chargement complet des groupes d'une saison.
   * On ne garde qu'une saison en mémoire, car l'usage normal de l'appli est mono-saison.
   */
  async loadBySaison(saisonId: number, options: { force?: boolean } = {}): Promise<Groupe[]> {
    const normalizedSaisonId = Number(saisonId);
    if (!normalizedSaisonId) return [];

    if (!options.force && this.isFullLoadedFor(normalizedSaisonId)) {
      return this.list();
    }

    if (
      this.loadPromise &&
      !options.force &&
      this.loadPromiseSaisonId === normalizedSaisonId
    ) {
      return this.loadPromise;
    }

    this.loadPromiseSaisonId = normalizedSaisonId;
    this.loadPromise = this.doLoadBySaison(normalizedSaisonId);

    try {
      return await this.loadPromise;
    } finally {
      this.loadPromise = null;
      this.loadPromiseSaisonId = null;
    }
  }

  async refresh(saisonId = this.stateSig().activeSaisonId ?? 0): Promise<Groupe[]> {
    return this.loadBySaison(saisonId, { force: true });
  }

  /**
   * Charge le détail si nécessaire puis l'ajoute au store.
   * Si le cache contient déjà le groupe, on sert le cache.
   */
  async getOrLoad(id: number, saisonId = this.stateSig().activeSaisonId ?? 0, options: { force?: boolean } = {}): Promise<Groupe> {
    const normalizedId = Number(id);
    const cached = this.byId(normalizedId);
    if (cached && !options.force) return cached;

    this.setLoading(true);
    try {
      const item = await this.repository.loadGroupeById(normalizedId, saisonId);
      this.upsertOne(item, saisonId || item.saison_id || null);
      return item;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async create(groupe: Groupe, saisonId: number): Promise<Groupe> {
    this.setLoading(true);
    try {
      const created = await this.repository.createGroupe(groupe, saisonId);
      this.upsertOne(created, saisonId);
      return created;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async update(groupe: Groupe, saisonId: number): Promise<Groupe> {
    this.setLoading(true);
    try {
      const updated = await this.repository.updateGroupe(groupe, saisonId);
      this.upsertOne(updated, saisonId);
      return updated;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Suppression simple côté groupe.
   * Pour l'écran groupes, préfère supprimer via GroupeRepository.deleteGroupe(...)
   * afin de retirer aussi les liens visibles côté adhérents, puis appelle removeLocal(id).
   */
  async delete(id: number): Promise<void> {
    this.setLoading(true);
    try {
      await this.repository.deleteGroupeOnly(Number(id));
      this.removeLocal(Number(id));
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  /** Ajout / remplacement local, utile après une action effectuée par un store écran. */
  upsertOne(groupe: Groupe, saisonId = this.stateSig().activeSaisonId): void {
    if (!groupe?.id) return;

    const normalizedSaisonId = saisonId ? Number(saisonId) : null;

    // Si on reçoit un groupe d'une autre saison, on bascule le store sur cette saison.
    if (normalizedSaisonId && this.stateSig().activeSaisonId !== normalizedSaisonId) {
      this.entitiesSig.set({});
      this.stateSig.update((s) => ({
        ...s,
        activeSaisonId: normalizedSaisonId,
        fullLoaded: false,
      }));
    }

    this.entitiesSig.update((entities) => ({
      ...entities,
      [Number(groupe.id)]: {
        ...groupe,
        saison_id: Number(groupe.saison_id ?? normalizedSaisonId ?? 0),
      },
    }));

    this.stateSig.update((s) => ({
      ...s,
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  upsertMany(groupes: Groupe[], saisonId = this.stateSig().activeSaisonId): void {
    for (const groupe of groupes ?? []) {
      this.upsertOne(groupe, saisonId);
    }
  }

  removeLocal(id: number): void {
    const { [Number(id)]: _, ...rest } = this.entitiesSig();
    this.entitiesSig.set(rest);
    this.stateSig.update((s) => ({ ...s, error: null, lastLoadedAt: Date.now() }));
  }

  /** Vide tout le store, utile au logout ou changement projet. */
  clear(): void {
    this.entitiesSig.set({});
    this.stateSig.set({
      activeSaisonId: null,
      fullLoaded: false,
      loading: false,
      error: null,
      lastLoadedAt: null,
    });
    this.loadPromise = null;
    this.loadPromiseSaisonId = null;
  }

  /** Marque le chargement complet comme périmé sans jeter les données déjà visibles. */
  invalidateFull(): void {
    this.stateSig.update((s) => ({ ...s, fullLoaded: false }));
  }

  private async doLoadBySaison(saisonId: number): Promise<Groupe[]> {
    this.setLoading(true);
    this.stateSig.update((s) => ({ ...s, activeSaisonId: saisonId }));

    try {
      const groupes = await this.repository.loadGroupes(saisonId);
      this.replaceAll(groupes, saisonId);
      return this.list();
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  private replaceAll(groupes: Groupe[], saisonId: number): void {
    const next: Record<number, Groupe> = {};

    for (const groupe of groupes ?? []) {
      if (!groupe?.id) continue;
      next[Number(groupe.id)] = {
        ...groupe,
        saison_id: Number(groupe.saison_id ?? saisonId),
      };
    }

    this.entitiesSig.set(next);
    this.stateSig.update((s) => ({
      ...s,
      activeSaisonId: saisonId,
      fullLoaded: true,
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  private setLoading(loading: boolean): void {
    this.stateSig.update((s) => ({ ...s, loading }));
  }

  private setError(e: unknown): void {
    const message = e instanceof Error ? e.message : 'Erreur lors du chargement des groupes';
    this.stateSig.update((s) => ({ ...s, error: message }));
  }
}

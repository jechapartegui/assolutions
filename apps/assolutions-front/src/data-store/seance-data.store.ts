import { computed, Injectable, signal } from '@angular/core';
import { Seance_VM } from '@shared/index';
import { SeanceRepository } from '../repository/seance.repository';

export type SeanceLoadMode = 'partial' | 'full';

interface SeanceDataState {
  saisonId: number | null;
  /** true quand on a chargé la liste complète des séances de la saison courante */
  fullLoaded: boolean;
  /** ids déjà demandés/chargés au moins une fois, même hors chargement complet */
  loadedIds: Set<number>;
  /** source indicative de la dernière mise à jour de chaque séance */
  loadModeById: Record<number, SeanceLoadMode>;
  loading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class SeanceDataStore {
  private readonly entitiesSig = signal<Record<number, Seance_VM>>({});

  private readonly stateSig = signal<SeanceDataState>({
    saisonId: null,
    fullLoaded: false,
    loadedIds: new Set<number>(),
    loadModeById: {},
    loading: false,
    error: null,
  });

  readonly entities = this.entitiesSig.asReadonly();
  readonly state = this.stateSig.asReadonly();

  readonly loading = computed(() => this.stateSig().loading);
  readonly error = computed(() => this.stateSig().error);
  readonly saisonId = computed(() => this.stateSig().saisonId);
  readonly fullLoaded = computed(() => this.stateSig().fullLoaded);

  readonly list = computed(() =>
    Object.values(this.entitiesSig()).sort((a, b) => {
      const da = this.toDateTime(a).getTime();
      const db = this.toDateTime(b).getTime();
      return da - db;
    }),
  );

  constructor(private readonly repository: SeanceRepository) {}

  byId(id: number): Seance_VM | null {
    return this.entitiesSig()[id] ?? null;
  }

  has(id: number): boolean {
    return !!this.entitiesSig()[id];
  }

  isFullLoadedFor(saisonId: number): boolean {
    const state = this.stateSig();
    return state.saisonId === saisonId && state.fullLoaded;
  }

  /**
   * À appeler avant un chargement sur une saison.
   * Dans ton cas 99,5% du temps c'est la même saison, donc on ne complexifie pas avec un cache multi-saison.
   */
  private ensureSaison(saisonId: number): void {
    const current = this.stateSig().saisonId;
    if (current === null || current === saisonId) return;

    this.entitiesSig.set({});
    this.stateSig.set({
      saisonId,
      fullLoaded: false,
      loadedIds: new Set<number>(),
      loadModeById: {},
      loading: false,
      error: null,
    });
  }

  /**
   * Chargement complet : écran séances, exports, gros écrans d'administration, etc.
   * Si déjà chargé pour la saison, ne rappelle pas le back sauf force=true.
   */
  async loadFull(saisonId: number, options: { force?: boolean } = {}): Promise<Seance_VM[]> {
    this.ensureSaison(saisonId);

    if (!options.force && this.isFullLoadedFor(saisonId)) {
      return this.list();
    }

    this.setLoading(true);
    try {
      const seances = await this.repository.loadSeances(saisonId);
      this.replaceAll(seances, saisonId);
      return this.list();
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  // À ajouter dans SeanceDataStore, en public, par exemple juste après loadFull().
// Ça permet au store écran de pousser dans le data store une liste déjà chargée par loadPageData(),
// sans refaire un deuxième appel back.

replaceFullFromExternal(seances: Seance_VM[], saisonId: number): void {
  this.ensureSaison(saisonId);
  this.replaceAll(seances, saisonId);
}


  /**
   * Chargement partiel : menu, mail, dashboard, prochaines séances, etc.
   * Les séances déjà présentes ne sont pas rechargées sauf force=true.
   *
   * Note : le repository actuel n'a pas encore de loadSeancesByIds enrichi.
   * On charge donc les ids manquants un par un via loadSeance().
   */
  async loadPartialByIds(
    ids: number[],
    saisonId: number,
    options: { force?: boolean } = {},
  ): Promise<Seance_VM[]> {
    this.ensureSaison(saisonId);

    const cleanIds = [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];
    if (!cleanIds.length) return [];

    const missingIds = options.force
      ? cleanIds
      : cleanIds.filter((id) => !this.has(id));

    if (!missingIds.length) {
      return cleanIds.map((id) => this.byId(id)).filter((x): x is Seance_VM => !!x);
    }

    this.setLoading(true);
    try {
      const loaded = await Promise.all(
        missingIds.map((id) => this.repository.loadSeance(id, saisonId)),
      );
      this.upsertMany(loaded, 'partial');
      return cleanIds.map((id) => this.byId(id)).filter((x): x is Seance_VM => !!x);
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Pratique pour un écran détail : renvoie le cache si présent, sinon charge la séance.
   */
  async getOrLoad(id: number, saisonId: number, options: { force?: boolean } = {}): Promise<Seance_VM> {
    this.ensureSaison(saisonId);

    const cached = this.byId(id);
    if (cached && !options.force) return cached;

    this.setLoading(true);
    try {
      const seance = await this.repository.loadSeance(id, saisonId);
      this.upsertOne(seance, 'partial');
      return seance;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async create(seance: Seance_VM): Promise<Seance_VM> {
    this.setLoading(true);
    try {
      const created = await this.repository.createSeance(seance);
      this.ensureSaison(created.saison_id);
      this.upsertOne(created, 'partial');
      return created;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async update(seance: Seance_VM, saisonId = seance.saison_id): Promise<Seance_VM> {
    this.setLoading(true);
    try {
      await this.repository.updateSeance(seance);
      // On recharge après update pour récupérer VM enrichie + liens cohérents.
      const refreshed = await this.repository.loadSeance(seance.id, saisonId);
      this.ensureSaison(refreshed.saison_id);
      this.upsertOne(refreshed, 'partial');
      return refreshed;
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
      await this.repository.deleteSeance(id);
      this.removeLocal(id);
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async createSerie(
    seance: Seance_VM,
    dateDebut: Date,
    dateFin: Date,
    jourSemaine: string,
    options: { reloadFull?: boolean } = { reloadFull: true },
  ): Promise<number[]> {
    this.setLoading(true);
    try {
      const ids = await this.repository.createSerie(seance, dateDebut, dateFin, jourSemaine);

      if (options.reloadFull !== false) {
        await this.loadFull(seance.saison_id, { force: true });
      } else {
        // On sait que ces ids existent, mais ils ne sont pas encore hydratés dans le store.
        this.markIdsAsKnown(ids, 'partial');
      }

      return ids;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async updateProfs(seanceId: number, profs: Seance_VM['seanceProfesseurs'], saisonId: number): Promise<Seance_VM> {
    this.setLoading(true);
    try {
      await this.repository.updateSeanceProfs(seanceId, profs);
      const refreshed = await this.repository.loadSeance(seanceId, saisonId);
      this.upsertOne(refreshed, 'partial');
      return refreshed;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async updateGroupes(seanceId: number, groupeIds: number[], saisonId: number): Promise<Seance_VM> {
    this.setLoading(true);
    try {
      await this.repository.updateSeanceGroupes(seanceId, groupeIds);
      const refreshed = await this.repository.loadSeance(seanceId, saisonId);
      this.upsertOne(refreshed, 'partial');
      return refreshed;
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
      saisonId: null,
      fullLoaded: false,
      loadedIds: new Set<number>(),
      loadModeById: {},
      loading: false,
      error: null,
    });
  }

  /** Marque le chargement complet comme périmé sans jeter les données déjà utiles à l'écran. */
  invalidateFull(): void {
    this.stateSig.update((s) => ({ ...s, fullLoaded: false }));
  }

  private replaceAll(seances: Seance_VM[], saisonId: number): void {
    const next: Record<number, Seance_VM> = {};
    const loadedIds = new Set<number>();
    const loadModeById: Record<number, SeanceLoadMode> = {};

    for (const seance of seances) {
      if (!seance?.id) continue;
      next[seance.id] = seance;
      loadedIds.add(seance.id);
      loadModeById[seance.id] = 'full';
    }

    this.entitiesSig.set(next);
    this.stateSig.update((s) => ({
      ...s,
      saisonId,
      fullLoaded: true,
      loadedIds,
      loadModeById,
      error: null,
    }));
  }

  private upsertMany(seances: Seance_VM[], mode: SeanceLoadMode): void {
    const current = this.entitiesSig();
    const next = { ...current };

    for (const seance of seances) {
      if (!seance?.id) continue;
      next[seance.id] = seance;
    }

    this.entitiesSig.set(next);
    this.markIdsAsKnown(seances.map((s) => s.id), mode);
    this.stateSig.update((s) => ({ ...s, error: null }));
  }

  private upsertOne(seance: Seance_VM, mode: SeanceLoadMode): void {
    this.upsertMany([seance], mode);
  }

  private removeLocal(id: number): void {
    const { [id]: _, ...rest } = this.entitiesSig();
    this.entitiesSig.set(rest);

    this.stateSig.update((s) => {
      const loadedIds = new Set(s.loadedIds);
      loadedIds.delete(id);

      const { [id]: __, ...loadModeById } = s.loadModeById;

      return {
        ...s,
        loadedIds,
        loadModeById,
        // Après suppression, la liste complète reste cohérente localement si elle l'était déjà.
        error: null,
      };
    });
  }

  private markIdsAsKnown(ids: number[], mode: SeanceLoadMode): void {
    this.stateSig.update((s) => {
      const loadedIds = new Set(s.loadedIds);
      const loadModeById = { ...s.loadModeById };

      for (const id of ids) {
        if (!id) continue;
        loadedIds.add(id);
        loadModeById[id] = mode;
      }

      return { ...s, loadedIds, loadModeById };
    });
  }

  private setLoading(loading: boolean): void {
    this.stateSig.update((s) => ({ ...s, loading }));
  }

  private setError(e: unknown): void {
    const message = e instanceof Error ? e.message : 'Erreur lors du chargement des séances';
    this.stateSig.update((s) => ({ ...s, error: message }));
  }

  private toDateTime(seance: Seance_VM): Date {
    const d = new Date(seance.date_seance);
    const [h, m] = (seance.heure_debut ?? '00:00').split(':').map(Number);
    d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
    return d;
  }
}

import {
  computed,
  Injectable,
  signal,
} from '@angular/core';
import { TarifInscription } from '@shared/index';

import { TarifInscriptionRepository } from '../repository/tarif-inscription.repository';

interface TarifInscriptionDataState {
  activeSaisonId: number | null;
  fullLoaded: boolean;
  loading: boolean;
  error: string | null;
  lastLoadedAt: number | null;
}

@Injectable({ providedIn: 'root' })
export class TarifInscriptionDataStore {
  private readonly entitiesSig =
    signal<Record<number, TarifInscription>>({});

  private readonly stateSig =
    signal<TarifInscriptionDataState>({
      activeSaisonId: null,
      fullLoaded: false,
      loading: false,
      error: null,
      lastLoadedAt: null,
    });

  readonly entities = this.entitiesSig.asReadonly();
  readonly state = this.stateSig.asReadonly();

  readonly activeSaisonId = computed(
    () => this.stateSig().activeSaisonId,
  );
  readonly loading = computed(
    () => this.stateSig().loading,
  );
  readonly error = computed(
    () => this.stateSig().error,
  );
  readonly fullLoaded = computed(
    () => this.stateSig().fullLoaded,
  );

  readonly list = computed(() =>
    Object.values(this.entitiesSig()).sort(
      (a, b) => this.compareTarifs(a, b),
    ),
  );

  private loadPromise:
    Promise<TarifInscription[]> | null = null;
  private loadPromiseSaisonId: number | null = null;

  constructor(
    private readonly repository:
      TarifInscriptionRepository,
  ) {}

  byId(id: number): TarifInscription | null {
    return this.entitiesSig()[Number(id)] ?? null;
  }

  isFullLoadedFor(saisonId: number): boolean {
    const state = this.stateSig();

    return (
      state.activeSaisonId === Number(saisonId)
      && state.fullLoaded
    );
  }

  async loadBySaison(
    saisonId: number,
    options: { force?: boolean } = {},
  ): Promise<TarifInscription[]> {
    const normalizedSaisonId = Number(saisonId);

    if (!normalizedSaisonId) {
      return [];
    }

    if (
      !options.force
      && this.isFullLoadedFor(normalizedSaisonId)
    ) {
      return this.list();
    }

    if (
      this.loadPromise
      && !options.force
      && this.loadPromiseSaisonId
        === normalizedSaisonId
    ) {
      return this.loadPromise;
    }

    this.loadPromiseSaisonId = normalizedSaisonId;
    this.loadPromise = this.doLoadBySaison(
      normalizedSaisonId,
    );

    try {
      return await this.loadPromise;
    } finally {
      this.loadPromise = null;
      this.loadPromiseSaisonId = null;
    }
  }

  async refresh(
    saisonId =
      this.stateSig().activeSaisonId ?? 0,
  ): Promise<TarifInscription[]> {
    return this.loadBySaison(
      saisonId,
      { force: true },
    );
  }

  async create(
    tarif: TarifInscription,
  ): Promise<TarifInscription> {
    this.setLoading(true);

    try {
      const created =
        await this.repository.create(tarif);
      this.upsertOne(created);
      return created;
    } catch (error) {
      this.setError(error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  async update(
    tarif: TarifInscription,
  ): Promise<TarifInscription> {
    this.setLoading(true);

    try {
      const updated =
        await this.repository.update(tarif);
      this.upsertOne(updated);
      return updated;
    } catch (error) {
      this.setError(error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  async remove(id: number): Promise<void> {
    this.setLoading(true);

    try {
      await this.repository.remove(Number(id));
      this.removeLocal(Number(id));
    } catch (error) {
      this.setError(error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  upsertOne(tarif: TarifInscription): void {
    if (!tarif?.id) {
      return;
    }

    const saisonId = Number(tarif.saison_id);

    if (
      saisonId
      && this.stateSig().activeSaisonId !== saisonId
    ) {
      this.entitiesSig.set({});
      this.stateSig.update((state) => ({
        ...state,
        activeSaisonId: saisonId,
        fullLoaded: false,
      }));
    }

    this.entitiesSig.update((entities) => ({
      ...entities,
      [Number(tarif.id)]: {
        ...tarif,
        groupe_ids: [...(tarif.groupe_ids ?? [])],
      },
    }));

    this.stateSig.update((state) => ({
      ...state,
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  removeLocal(id: number): void {
    const {
      [Number(id)]: _removed,
      ...rest
    } = this.entitiesSig();

    this.entitiesSig.set(rest);

    this.stateSig.update((state) => ({
      ...state,
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

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

  private async doLoadBySaison(
    saisonId: number,
  ): Promise<TarifInscription[]> {
    this.setLoading(true);
    this.stateSig.update((state) => ({
      ...state,
      activeSaisonId: saisonId,
    }));

    try {
      const items =
        await this.repository.loadBySaison(saisonId);
      this.replaceAll(items, saisonId);
      return this.list();
    } catch (error) {
      this.setError(error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  private replaceAll(
    items: TarifInscription[],
    saisonId: number,
  ): void {
    const next:
      Record<number, TarifInscription> = {};

    for (const item of items ?? []) {
      if (!item?.id) {
        continue;
      }

      next[Number(item.id)] = {
        ...item,
        saison_id: Number(
          item.saison_id ?? saisonId,
        ),
        groupe_ids: [...(item.groupe_ids ?? [])],
      };
    }

    this.entitiesSig.set(next);
    this.stateSig.update((state) => ({
      ...state,
      activeSaisonId: saisonId,
      fullLoaded: true,
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  private setLoading(loading: boolean): void {
    this.stateSig.update((state) => ({
      ...state,
      loading,
    }));
  }

  private setError(error: unknown): void {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur lors du chargement des tarifs d'inscription";

    this.stateSig.update((state) => ({
      ...state,
      error: message,
    }));
  }

  private compareTarifs(
    a: TarifInscription,
    b: TarifInscription,
  ): number {
    const order =
      Number(a.ordre ?? 0) - Number(b.ordre ?? 0);

    if (order !== 0) {
      return order;
    }

    return (a.nom ?? '').localeCompare(
      b.nom ?? '',
      'fr',
      { sensitivity: 'base' },
    );
  }
}

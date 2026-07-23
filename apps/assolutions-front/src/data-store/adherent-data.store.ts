import { computed, Injectable, signal } from '@angular/core';
import { AdherentRepository } from '../repository/adherent.repository';
import {
  AdherentDetail_VM,
  AdherentListItem_VM,
} from '../vm/adherent-page.vm';
import { LienGroupe_VM } from '@shared/index';

export type AdherentLoadMode = 'partial' | 'full';

interface AdherentDataState {
  activeSaisonId: number | null;
  fullLoaded: boolean;
  loadedIds: Set<number>;
  detailLoadedIds: Set<number>;
  loadModeById: Record<number, AdherentLoadMode>;
  loading: boolean;
  error: string | null;
  lastLoadedAt: number | null;
}

@Injectable({ providedIn: 'root' })
export class AdherentDataStore {
  private readonly entitiesSig = signal<Record<number, AdherentListItem_VM>>({});
  private readonly detailsSig = signal<Record<number, AdherentDetail_VM>>({});

  private readonly stateSig = signal<AdherentDataState>({
    activeSaisonId: null,
    fullLoaded: false,
    loadedIds: new Set<number>(),
    detailLoadedIds: new Set<number>(),
    loadModeById: {},
    loading: false,
    error: null,
    lastLoadedAt: null,
  });

  readonly entities = this.entitiesSig.asReadonly();
  readonly details = this.detailsSig.asReadonly();
  readonly state = this.stateSig.asReadonly();

  readonly loading = computed(() => this.stateSig().loading);
  readonly error = computed(() => this.stateSig().error);
  readonly activeSaisonId = computed(() => this.stateSig().activeSaisonId);
  readonly fullLoaded = computed(() => this.stateSig().fullLoaded);
  readonly lastLoadedAt = computed(() => this.stateSig().lastLoadedAt);

  readonly list = computed(() =>
    Object.values(this.entitiesSig()).sort((a, b) =>
      (a.nom ?? '').localeCompare(b.nom ?? '', 'fr', { sensitivity: 'base' }),
    ),
  );

  private fullLoadPromise: Promise<AdherentListItem_VM[]> | null = null;
  private fullLoadPromiseSaisonId: number | null = null;
  private partialLoadPromiseByKey = new Map<string, Promise<AdherentListItem_VM[]>>();
  private detailLoadPromiseByKey = new Map<string, Promise<AdherentDetail_VM>>();

  constructor(private readonly repository: AdherentRepository) {}

  byId(id: number): AdherentListItem_VM | null {
    return this.entitiesSig()[Number(id)] ?? null;
  }

  detailById(id: number): AdherentDetail_VM | null {
    return this.detailsSig()[Number(id)] ?? null;
  }

  has(id: number): boolean {
    return !!this.byId(id);
  }

  hasDetail(id: number): boolean {
    return !!this.detailById(id);
  }

  isFullLoadedFor(saisonId: number): boolean {
    const state = this.stateSig();
    return state.activeSaisonId === Number(saisonId) && state.fullLoaded;
  }

  async loadBySaison(
    saisonId: number,
    options: { force?: boolean; includePhotos?: boolean } = { includePhotos: true },
  ): Promise<AdherentListItem_VM[]> {
    const normalizedSaisonId = Number(saisonId);
    if (!normalizedSaisonId) return [];

    this.ensureSaison(normalizedSaisonId);

    if (!options.force && this.isFullLoadedFor(normalizedSaisonId)) {
      return this.list();
    }

    if (
      this.fullLoadPromise &&
      !options.force &&
      this.fullLoadPromiseSaisonId === normalizedSaisonId
    ) {
      return this.fullLoadPromise;
    }

    this.fullLoadPromiseSaisonId = normalizedSaisonId;
    this.fullLoadPromise = this.doLoadBySaison(normalizedSaisonId, options);

    try {
      return await this.fullLoadPromise;
    } finally {
      this.fullLoadPromise = null;
      this.fullLoadPromiseSaisonId = null;
    }
  }

  async refresh(saisonId = this.stateSig().activeSaisonId ?? 0): Promise<AdherentListItem_VM[]> {
    return this.loadBySaison(Number(saisonId), { force: true, includePhotos: true });
  }

  async loadPartialByIds(
    ids: number[],
    saisonId: number,
    options: { force?: boolean; includePhotos?: boolean } = { includePhotos: true },
  ): Promise<AdherentListItem_VM[]> {
    const normalizedSaisonId = Number(saisonId);
    const cleanIds = this.cleanIds(ids);
    if (!normalizedSaisonId || !cleanIds.length) return [];

    this.ensureSaison(normalizedSaisonId);

    const missingIds = options.force
      ? cleanIds
      : cleanIds.filter((id) => !this.has(id));

    if (missingIds.length) {
      const key = `${normalizedSaisonId}:${missingIds.join(',')}`;
      const existingPromise = this.partialLoadPromiseByKey.get(key);

      if (existingPromise && !options.force) {
        await existingPromise;
      } else {
        const promise = this.doLoadPartialByIds(missingIds, normalizedSaisonId, options);
        this.partialLoadPromiseByKey.set(key, promise);
        try {
          await promise;
        } finally {
          this.partialLoadPromiseByKey.delete(key);
        }
      }
    }

    return cleanIds.map((id) => this.byId(id)).filter((x): x is AdherentListItem_VM => !!x);
  }

  async getOrLoadDetail(
    id: number,
    saisonId: number,
    options: { force?: boolean } = {},
  ): Promise<AdherentDetail_VM> {
    const normalizedId = Number(id);
    const normalizedSaisonId = Number(saisonId);
    if (!normalizedId || !normalizedSaisonId) {
      throw new Error('Adhérent ou saison invalide');
    }

    this.ensureSaison(normalizedSaisonId);

    const cached = this.detailById(normalizedId);
    if (cached && !options.force) return cached;

    const key = `${normalizedSaisonId}:${normalizedId}`;
    const existingPromise = this.detailLoadPromiseByKey.get(key);
    if (existingPromise && !options.force) return existingPromise;

    const promise = this.doLoadDetail(normalizedId, normalizedSaisonId);
    this.detailLoadPromiseByKey.set(key, promise);
    try {
      return await promise;
    } finally {
      this.detailLoadPromiseByKey.delete(key);
    }
  }

  async create(vm: AdherentDetail_VM, saisonId: number): Promise<AdherentDetail_VM> {
    this.setLoading(true);
    try {
      const saved = await this.repository.createAdherent(vm, Number(saisonId));
      this.upsertDetail(saved, Number(saisonId));
      this.upsertOne(this.toListItem(saved, Number(saisonId)), 'partial');
      this.invalidateFull();
      return saved;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async update(vm: AdherentDetail_VM, saisonId: number): Promise<AdherentDetail_VM> {
    this.setLoading(true);
    try {
      const saved = await this.repository.updateAdherent(vm, Number(saisonId));
      this.upsertDetail(saved, Number(saisonId));
      this.upsertOne(this.toListItem(saved, Number(saisonId)), 'partial');
      return saved;
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
      await this.repository.deleteAdherent(normalizedId);
      this.removeLocal(normalizedId);
      this.invalidateFull();
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  upsertOne(item: AdherentListItem_VM, mode: AdherentLoadMode = 'partial'): void {
    if (!item?.id) return;
    const id = Number(item.id);

    this.entitiesSig.update((entities) => ({ ...entities, [id]: item }));
    this.stateSig.update((s) => ({
      ...s,
      loadedIds: new Set([...s.loadedIds, id]),
      loadModeById: { ...s.loadModeById, [id]: mode },
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  upsertMany(items: AdherentListItem_VM[], mode: AdherentLoadMode = 'partial'): void {
    const next = { ...this.entitiesSig() };
    const loadedIds = new Set(this.stateSig().loadedIds);
    const loadModeById = { ...this.stateSig().loadModeById };

    for (const item of items ?? []) {
      if (!item?.id) continue;
      const id = Number(item.id);
      next[id] = item;
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

  upsertDetail(detail: AdherentDetail_VM, saisonId = this.stateSig().activeSaisonId ?? 0): void {
    if (!detail?.id) return;
    const id = Number(detail.id);

    this.detailsSig.update((details) => ({ ...details, [id]: detail }));
    this.entitiesSig.update((entities) => ({
      ...entities,
      [id]: this.toListItem(detail, Number(saisonId)),
    }));

    this.stateSig.update((s) => ({
      ...s,
      detailLoadedIds: new Set([...s.detailLoadedIds, id]),
      loadedIds: new Set([...s.loadedIds, id]),
      loadModeById: { ...s.loadModeById, [id]: s.fullLoaded ? 'full' : 'partial' },
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  removeLocal(id: number): void {
    const normalizedId = Number(id);
    const { [normalizedId]: _, ...entities } = this.entitiesSig();
    const { [normalizedId]: __, ...details } = this.detailsSig();
    const loadedIds = new Set(this.stateSig().loadedIds);
    const detailLoadedIds = new Set(this.stateSig().detailLoadedIds);
    const { [normalizedId]: ___, ...loadModeById } = this.stateSig().loadModeById;

    loadedIds.delete(normalizedId);
    detailLoadedIds.delete(normalizedId);

    this.entitiesSig.set(entities);
    this.detailsSig.set(details);
    this.stateSig.update((s) => ({
      ...s,
      loadedIds,
      detailLoadedIds,
      loadModeById,
      error: null,
      lastLoadedAt: Date.now(),
    }));
  }

  addGroupeLocal(personneId: number, groupe: { id: number; nom: string }): void {
    const id = Number(personneId);
    const groupeId = Number(groupe.id);
    if (!id || !groupeId) return;

    const add = (groupes: LienGroupe_VM[] = []) => {
      if (groupes.some((g) => Number(g.id) === groupeId)) return groupes;
      return [
        ...groupes,
        { id: groupeId, groupe_id: groupeId, nom: groupe.nom, id_lien: 0 } as LienGroupe_VM,
      ];
    };

    this.entitiesSig.update((entities) => {
      const item = entities[id];
      if (!item) return entities;
      return { ...entities, [id]: { ...item, groupesActifs: add(item.groupesActifs) } as AdherentListItem_VM };
    });

    this.detailsSig.update((details) => {
      const detail = details[id];
      if (!detail) return details;
      return { ...details, [id]: { ...detail, groupesParSaison: add(detail.groupesParSaison) } as AdherentDetail_VM };
    });
  }

  removeGroupeLocal(personneId: number, groupeId: number): void {
    const id = Number(personneId);
    const gid = Number(groupeId);
    if (!id || !gid) return;

    const remove = (groupes: LienGroupe_VM[] = []) =>
      groupes.filter((g) => Number(g.id) !== gid);

    this.entitiesSig.update((entities) => {
      const item = entities[id];
      if (!item) return entities;
      return { ...entities, [id]: { ...item, groupesActifs: remove(item.groupesActifs) } as AdherentListItem_VM };
    });

    this.detailsSig.update((details) => {
      const detail = details[id];
      if (!detail) return details;
      return { ...details, [id]: { ...detail, groupesParSaison: remove(detail.groupesParSaison) } as AdherentDetail_VM };
    });
  }

  removeGroupeFromAllLocal(groupeId: number): void {
    const gid = Number(groupeId);
    if (!gid) return;

    const remove = (groupes: LienGroupe_VM[] = []) =>
      groupes.filter((g) => Number(g.id) !== gid);

    this.entitiesSig.update((entities) => {
      const next: Record<number, AdherentListItem_VM> = {};
      for (const [id, item] of Object.entries(entities)) {
        next[Number(id)] = { ...item, groupesActifs: remove(item.groupesActifs) } as AdherentListItem_VM;
      }
      return next;
    });

    this.detailsSig.update((details) => {
      const next: Record<number, AdherentDetail_VM> = {};
      for (const [id, detail] of Object.entries(details)) {
        next[Number(id)] = { ...detail, groupesParSaison: remove(detail.groupesParSaison) } as AdherentDetail_VM;
      }
      return next;
    });
  }

  updateGroupeNameLocal(groupeId: number, nom: string): void {
    const gid = Number(groupeId);
    if (!gid) return;

    const rename = (groupes: LienGroupe_VM[] = []) =>
      groupes.map((g : LienGroupe_VM) => Number(g.id) === gid ? { ...g, nom } as LienGroupe_VM : g);

    this.entitiesSig.update((entities) => {
      const next: Record<number, AdherentListItem_VM> = {};
      for (const [id, item] of Object.entries(entities)) {
        next[Number(id)] = { ...item, groupesActifs: rename(item.groupesActifs) } as AdherentListItem_VM;
      }
      return next;
    });

    this.detailsSig.update((details) => {
      const next: Record<number, AdherentDetail_VM> = {};
      for (const [id, detail] of Object.entries(details)) {
        next[Number(id)] = { ...detail, groupesParSaison: rename(detail.groupesParSaison) } as AdherentDetail_VM;
      }
      return next;
    });
  }

  replaceFullFromExternal(items: AdherentListItem_VM[], saisonId: number): void {
    this.ensureSaison(Number(saisonId));
    this.replaceAll(items, Number(saisonId));
  }

  invalidateFull(): void {
    this.stateSig.update((s) => ({ ...s, fullLoaded: false }));
  }

  clear(): void {
    this.entitiesSig.set({});
    this.detailsSig.set({});
    this.stateSig.set({
      activeSaisonId: null,
      fullLoaded: false,
      loadedIds: new Set<number>(),
      detailLoadedIds: new Set<number>(),
      loadModeById: {},
      loading: false,
      error: null,
      lastLoadedAt: null,
    });
    this.fullLoadPromise = null;
    this.fullLoadPromiseSaisonId = null;
    this.partialLoadPromiseByKey.clear();
    this.detailLoadPromiseByKey.clear();
  }

  private async doLoadBySaison(
    saisonId: number,
    options: { includePhotos?: boolean } = {},
  ): Promise<AdherentListItem_VM[]> {
    this.setLoading(true);
    try {
      const items = await this.repository.loadAdherentListForSaison(saisonId, {
        includePhotos: options.includePhotos ?? true,
      });
      this.replaceAll(items, saisonId);
      return this.list();
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  private async doLoadPartialByIds(
    ids: number[],
    saisonId: number,
    options: { includePhotos?: boolean } = {},
  ): Promise<AdherentListItem_VM[]> {
    this.setLoading(true);
    try {
      const items = await this.repository.loadAdherentListByIds(ids, saisonId, {
        includePhotos: options.includePhotos ?? true,
      });
      this.upsertMany(items, 'partial');
      return items;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  private async doLoadDetail(id: number, saisonId: number): Promise<AdherentDetail_VM> {
    this.setLoading(true);
    try {
      const detail = await this.repository.loadAdherentDetail(id, saisonId);
      this.upsertDetail(detail, saisonId);
      return detail;
    } catch (e) {
      this.setError(e);
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  private replaceAll(items: AdherentListItem_VM[], saisonId: number): void {
    const next: Record<number, AdherentListItem_VM> = {};
    const loadedIds = new Set<number>();
    const loadModeById: Record<number, AdherentLoadMode> = {};

    for (const item of items ?? []) {
      if (!item?.id) continue;
      const id = Number(item.id);
      next[id] = item;
      loadedIds.add(id);
      loadModeById[id] = 'full';
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
    const normalizedSaisonId = Number(saisonId);
    const current = this.stateSig().activeSaisonId;
    if (!normalizedSaisonId || current === normalizedSaisonId) return;

    if (current === null) {
      this.stateSig.update((s) => ({ ...s, activeSaisonId: normalizedSaisonId }));
      return;
    }

    this.entitiesSig.set({});
    this.detailsSig.set({});
    this.stateSig.set({
      activeSaisonId: normalizedSaisonId,
      fullLoaded: false,
      loadedIds: new Set<number>(),
      detailLoadedIds: new Set<number>(),
      loadModeById: {},
      loading: false,
      error: null,
      lastLoadedAt: null,
    });
  }

  private toListItem(detail: AdherentDetail_VM, saisonId: number): AdherentListItem_VM {
    const item = new AdherentListItem_VM();
    Object.assign(item, detail);

    item.saisonActiveId = saisonId;
    item.inscrit = detail.inscriptionsSaison?.some(
      (x) => x.saison_id === saisonId && x.active === true,
    ) ?? false;
    item.groupesActifs = detail.groupesParSaison ?? [];
    item.nbInscriptionsSeance = detail.inscriptionsSeance?.length ?? 0;

    return item;
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

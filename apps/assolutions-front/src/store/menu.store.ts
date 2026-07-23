import { computed, Injectable, signal } from '@angular/core';
import { InscriptionStatus_VM, Seance_VM } from '@shared/index';

import { MenuDataStore } from '../data-store/menu-data.store';
import { CachedScreenStore } from './cached-screen.store';
import {
  createEmptyMenuVm,
  MenuPendingRefresh,
} from '../vm/menu.vm';

type MenuRights = {
  visible?: boolean;
  adherent?: boolean;
  prof?: boolean;
  essai?: boolean;
} | null;

@Injectable({ providedIn: 'root' })
export class MenuStore extends CachedScreenStore<MenuPendingRefresh> {
  private static readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  private readonly _vm = signal(createEmptyMenuVm());
  readonly vm = computed(() => this._vm());

  private initPromise: Promise<void> | null = null;
  private silentRefreshPromise: Promise<void> | null = null;
  private hardRefreshPromise: Promise<void> | null = null;

  constructor(
    private readonly menuDataStore: MenuDataStore,
  ) {
    super(MenuStore.TTL_MS);
  }

  async init(
    projectId: number,
    saisonId: number,
    rights: MenuRights,
  ): Promise<void> {
    const state = this._vm();

    if (this.hasCurrentCache(state.initialized)) {
      if (this.shouldRefreshSilently(state.initialized, state.lastLoadedAt)) {
        void this.refreshSilently(projectId, saisonId, rights);
      }
      return;
    }

    if (this.initPromise) return this.initPromise;

    this.initPromise = this.loadInitialData(projectId, saisonId, rights);

    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async loadInitialData(
    projectId: number,
    saisonId: number,
    rights: MenuRights,
  ): Promise<void> {
    this._vm.update((s) => ({
      ...s,
      loading: true,
      action: $localize`Chargement du menu`,
    }));

    try {
      const fresh = await this.menuDataStore.load(projectId, saisonId, rights);
      this.setCurrentData(fresh);
      this.applyDataToVm(fresh, {
        loading: false,
        initialized: true,
        refreshAvailable: false,
        lastLoadedAt: Date.now(),
        action: '',
      });
    } catch {
      this._vm.update((s) => ({
        ...s,
        loading: false,
        action: '',
      }));
      throw new Error('Chargement du menu impossible');
    }
  }

  async refreshSilently(
    projectId: number,
    saisonId: number,
    rights: MenuRights,
  ): Promise<void> {
    if (this.silentRefreshPromise) return this.silentRefreshPromise;

    this.silentRefreshPromise = this.runSilentRefresh(projectId, saisonId, rights);

    try {
      await this.silentRefreshPromise;
    } finally {
      this.silentRefreshPromise = null;
    }
  }

  private async runSilentRefresh(
    projectId: number,
    saisonId: number,
    rights: MenuRights,
  ): Promise<void> {
    try {
      const fresh = await this.menuDataStore.refresh(projectId, saisonId, rights);
      const changed = this.menuDataStore.hasChanged(this.currentData, fresh);

      if (!changed) {
        this.setPendingData(null);
        this.setCurrentData(fresh);
        this._vm.update((s) => ({
          ...s,
          refreshAvailable: false,
          lastLoadedAt: Date.now(),
        }));
        return;
      }

      this.setPendingData(fresh);
      this._vm.update((s) => ({
        ...s,
        refreshAvailable: true,
      }));
    } catch {
      // Refresh silencieux : on n’écrase jamais l’affichage courant.
    }
  }

  async refreshNow(
    projectId: number,
    saisonId: number,
    rights: MenuRights,
  ): Promise<void> {
    if (this.hardRefreshPromise) return this.hardRefreshPromise;

    this.hardRefreshPromise = this.runHardRefresh(projectId, saisonId, rights);

    try {
      await this.hardRefreshPromise;
    } finally {
      this.hardRefreshPromise = null;
    }
  }

  private async runHardRefresh(
    projectId: number,
    saisonId: number,
    rights: MenuRights,
  ): Promise<void> {
    this._vm.update((s) => ({
      ...s,
      loading: true,
      action: $localize`Actualisation du menu`,
    }));

    try {
      const fresh = await this.menuDataStore.refresh(projectId, saisonId, rights);
      this.setCurrentData(fresh);
      this.applyDataToVm(fresh, {
        loading: false,
        initialized: true,
        refreshAvailable: false,
        lastLoadedAt: Date.now(),
        action: '',
      });
    } catch {
      this._vm.update((s) => ({
        ...s,
        loading: false,
        action: '',
      }));
      throw new Error('Erreur lors de l’actualisation du menu');
    }
  }

  applyRefresh(): void {
    const applied = this.applyPendingData();
    if (!applied) return;

    this.menuDataStore.setCurrent(applied);
    this.applyDataToVm(applied, {
      refreshAvailable: false,
      lastLoadedAt: Date.now(),
    });
  }

  patchLocalInscription(
    riderId: number,
    seanceId: number,
    statut: InscriptionStatus_VM | null,
  ): void {
    this.menuDataStore.patchLocalInscription(riderId, seanceId, statut);
    const patched = this.menuDataStore.current();

    if (patched) {
      this.setCurrentData(patched);
      this.applyDataToVm(patched, {
        lastLoadedAt: this._vm().lastLoadedAt,
      });
      return;
    }

    this._vm.update((state) => {
      for (const rider of state.riders) {
        if (rider.id !== riderId) continue;

        rider.MesSeances = (rider.MesSeances ?? []).map((ms) => {
          if (ms.seance?.id !== seanceId) return ms;
          return { ...ms, statutInscription: statut };
        });
      }

      return {
        ...state,
        riders: [...state.riders],
      };
    });
  }

  patchLocalSeance(seance: Seance_VM): void {
    this.menuDataStore.patchLocalSeance(seance);
    const patched = this.menuDataStore.current();

    if (patched) {
      this.setCurrentData(patched);
      this.applyDataToVm(patched, {
        lastLoadedAt: this._vm().lastLoadedAt,
      });
      return;
    }

    this._vm.update((state) => {
      const updatedRiders = state.riders.map((rider) => {
        const clonedRider = Object.assign(
          Object.create(Object.getPrototypeOf(rider)),
          rider,
        ) as typeof rider;

        clonedRider.MesSeances = (rider.MesSeances ?? []).map((ms) => {
          if (ms.seance?.id !== seance.id) return ms;

          return {
            ...ms,
            seance: {
              ...ms.seance,
              ...seance,
            },
          };
        });

        return clonedRider;
      });

      return {
        ...state,
        riders: updatedRiders,
      };
    });
  }

  invalidate(): void {
    this.clearCacheData();
    this.menuDataStore.clear();
    this._vm.update((s) => ({
      ...s,
      initialized: false,
      refreshAvailable: false,
      lastLoadedAt: null,
    }));
  }

  reset(): void {
    this.clearCacheData();
    this.menuDataStore.clear();
    this.initPromise = null;
    this.silentRefreshPromise = null;
    this.hardRefreshPromise = null;
    this._vm.set(createEmptyMenuVm());
  }

  private applyDataToVm(
    data: MenuPendingRefresh,
    patch: Partial<ReturnType<typeof createEmptyMenuVm>> = {},
  ): void {
    this._vm.set({
      ...this._vm(),
      ...data.refs,
      riders: data.riders,
      anniversaire: data.anniversaire,
      ...patch,
    });
  }
}

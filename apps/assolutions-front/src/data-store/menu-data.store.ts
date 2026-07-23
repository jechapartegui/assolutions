import { computed, Injectable, signal } from '@angular/core';
import { InscriptionStatus_VM, Seance_VM } from '@shared/index';

import { AdherentMenu } from '../class/adherent-menu';
import { MenuRepository } from '../repository/menu.repository';
import { MenuPendingRefresh } from '../vm/menu.vm';

type MenuRights = {
  visible?: boolean;
  adherent?: boolean;
  prof?: boolean;
  essai?: boolean;
} | null;

interface MenuDataState {
  key: string | null;
  loading: boolean;
  error: string | null;
  lastLoadedAt: number | null;
}

@Injectable({ providedIn: 'root' })
export class MenuDataStore {
  private readonly dataSig = signal<MenuPendingRefresh | null>(null);
  private readonly stateSig = signal<MenuDataState>({
    key: null,
    loading: false,
    error: null,
    lastLoadedAt: null,
  });

  readonly current = this.dataSig.asReadonly();
  readonly state = this.stateSig.asReadonly();

  readonly loading = computed(() => this.stateSig().loading);
  readonly error = computed(() => this.stateSig().error);
  readonly lastLoadedAt = computed(() => this.stateSig().lastLoadedAt);
  readonly riders = computed(() => this.dataSig()?.riders ?? []);
  readonly anniversaire = computed(() => this.dataSig()?.anniversaire ?? []);
  readonly refs = computed(() => this.dataSig()?.refs ?? null);

  private loadPromise: Promise<MenuPendingRefresh> | null = null;
  private loadPromiseKey: string | null = null;

  constructor(private readonly repository: MenuRepository) {}

  async load(
    projectId: number,
    saisonId: number,
    rights: MenuRights,
    options: { force?: boolean } = {},
  ): Promise<MenuPendingRefresh> {
    const key = this.buildKey(projectId, saisonId, rights);
    const current = this.dataSig();
    const state = this.stateSig();

    if (!options.force && current && state.key === key) {
      return current;
    }

    if (!options.force && this.loadPromise && this.loadPromiseKey === key) {
      return this.loadPromise;
    }

    this.loadPromiseKey = key;
    this.loadPromise = this.doLoad(projectId, saisonId, rights, key);

    try {
      return await this.loadPromise;
    } finally {
      this.loadPromise = null;
      this.loadPromiseKey = null;
    }
  }

  refresh(
    projectId: number,
    saisonId: number,
    rights: MenuRights,
  ): Promise<MenuPendingRefresh> {
    return this.load(projectId, saisonId, rights, { force: true });
  }

  hasChanged(current: MenuPendingRefresh | null, incoming: MenuPendingRefresh | null): boolean {
    return this.repository.hasChanged(current, incoming);
  }

  patchLocalInscription(
    riderId: number,
    seanceId: number,
    statut: InscriptionStatus_VM | null,
  ): void {
    this.dataSig.update((data) => {
      if (!data) return data;

      return {
        ...data,
        riders: this.patchRidersInscription(data.riders, riderId, seanceId, statut),
      };
    });
  }

  patchLocalSeance(seance: Seance_VM): void {
    this.dataSig.update((data) => {
      if (!data) return data;

      return {
        ...data,
        riders: this.patchRidersSeance(data.riders, seance),
      };
    });
  }

  setCurrent(data: MenuPendingRefresh | null, key?: string | null): void {
    this.dataSig.set(data);
    this.stateSig.update((state) => ({
      ...state,
      key: key ?? state.key,
      error: null,
      lastLoadedAt: data ? Date.now() : null,
    }));
  }

  clear(): void {
    this.dataSig.set(null);
    this.stateSig.set({
      key: null,
      loading: false,
      error: null,
      lastLoadedAt: null,
    });
    this.loadPromise = null;
    this.loadPromiseKey = null;
  }

  private async doLoad(
    projectId: number,
    saisonId: number,
    rights: MenuRights,
    key: string,
  ): Promise<MenuPendingRefresh> {
    this.stateSig.update((state) => ({
      ...state,
      key,
      loading: true,
      error: null,
    }));

    try {
      const data = await this.repository.loadMenuData(projectId, saisonId, rights);
      this.dataSig.set(data);
      this.stateSig.update((state) => ({
        ...state,
        key,
        loading: false,
        error: null,
        lastLoadedAt: Date.now(),
      }));
      return data;
    } catch (error: any) {
      this.stateSig.update((state) => ({
        ...state,
        loading: false,
        error: error?.message ?? 'Chargement du menu impossible',
      }));
      throw error;
    }
  }

  private patchRidersInscription(
    riders: AdherentMenu[],
    riderId: number,
    seanceId: number,
    statut: InscriptionStatus_VM | null,
  ): AdherentMenu[] {
    return (riders ?? []).map((rider) => {
      if (Number(rider.id) !== Number(riderId)) return rider;

      const clonedRider = this.cloneRider(rider);
      clonedRider.MesSeances = (rider.MesSeances ?? []).map((ms) => {
        if (Number(ms.seance?.id) !== Number(seanceId)) return ms;
        return { ...ms, statutInscription: statut };
      });

      return clonedRider;
    });
  }

  private patchRidersSeance(riders: AdherentMenu[], seance: Seance_VM): AdherentMenu[] {
    return (riders ?? []).map((rider) => {
      const clonedRider = this.cloneRider(rider);
      clonedRider.MesSeances = (rider.MesSeances ?? []).map((ms) => {
        if (Number(ms.seance?.id) !== Number(seance.id)) return ms;

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
  }

  private cloneRider(rider: AdherentMenu): AdherentMenu {
    return Object.assign(
      Object.create(Object.getPrototypeOf(rider)),
      rider,
    ) as AdherentMenu;
  }

  private buildKey(projectId: number, saisonId: number, rights: MenuRights): string {
    return JSON.stringify({
      projectId: Number(projectId),
      saisonId: Number(saisonId),
      rights: {
        visible: !!rights?.visible,
        adherent: !!rights?.adherent,
        prof: !!rights?.prof,
        essai: !!rights?.essai,
      },
    });
  }
}

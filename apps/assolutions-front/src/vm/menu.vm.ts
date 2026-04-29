import { KeyValuePair } from '@shared/lib/autres.interface';
import { Cours_VM, Groupe, Lieu_VM, ProfLight_VM } from '@shared/index';
import { AdherentMenu } from '../class/adherent-menu';

export interface MenuReferencesVm {
  listeprof: ProfLight_VM[];
  listelieu: Lieu_VM[];
  listegroupe: Groupe[];
  listeCours: Cours_VM[];

  liste_prof_filter: KeyValuePair[];
  liste_lieu_filter: string[];
  liste_groupe_filter: string[];
  liste_cours_filter: string[];
}

export interface MenuPendingRefresh {
  riders: AdherentMenu[];
  anniversaire: string[];
  refs: MenuReferencesVm;
}

export interface MenuVm extends MenuReferencesVm {
  riders: AdherentMenu[];
  anniversaire: string[];

  loading: boolean;
  initialized: boolean;
  refreshAvailable: boolean;
  lastLoadedAt: number | null;
  action: string;
}

export function createEmptyMenuReferencesVm(): MenuReferencesVm {
  return {
    listeprof: [],
    listelieu: [],
    listegroupe: [],
    listeCours: [],
    liste_prof_filter: [],
    liste_lieu_filter: [],
    liste_groupe_filter: [],
    liste_cours_filter: [],
  };
}

export function createEmptyMenuVm(): MenuVm {
  return {
    ...createEmptyMenuReferencesVm(),
    riders: [],
    anniversaire: [],
    loading: false,
    initialized: false,
    refreshAvailable: false,
    lastLoadedAt: null,
    action: '',
  };
}
import {
  Cours_VM,
  Groupe,
  KeyValuePair,
  Saison,
  Seance_VM,
  StatutSeance,
} from '@shared/index';
import { SeanceFilterVm } from './seance-filter.vm';

export interface SeanceReferencesVm {
  listeCours: Cours_VM[];
  listeGroupe: Groupe[];
  listeLieu: KeyValuePair[];
  listeProf: KeyValuePair[];
  listeSaison: Saison[];
  liste_lieu_filter: string[];
  liste_prof_filter: KeyValuePair[];
  liste_groupe_filter: Groupe[];
  listeStatuts: StatutSeance[];
}

export interface SeancePageData {
  refs: SeanceReferencesVm;
  list: Seance_VM[];
  activeSaison: Saison;
}

export interface SeancePageVm extends SeancePageData {
  loading: boolean;
  filter: SeanceFilterVm;
  selectedFilter: string | null;
  selectedSort: 'nom' | 'date' | 'cours' | 'lieu' | null;
  selectedSortSens: 'ASC' | 'DESC';
  showFilterPanel: boolean;
  showSortPanel: boolean;
  showScrollToTop: boolean;
  editSeance: Seance_VM | null;
  editModeSerie: boolean;
  readonly: boolean;
  isValid: boolean;
  lastLoadedAt: number | null;
refreshAvailable: boolean;
pendingCount: number;
action: string;
multiSelectMode: boolean;
selectedIds: number[];
}
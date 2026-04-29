import { Cours_VM, Groupe, KeyValuePair, Saison } from '@shared/index';
import { CoursFilterVm } from './cours-filter.vm';

export interface CoursReferencesVm {
  listeCours: Cours_VM[];
  listeGroupe: Groupe[];
  listeLieu: KeyValuePair[];
  listeProf: KeyValuePair[];
  listeSaison: Saison[];
  liste_lieu_filter: KeyValuePair[];
  liste_prof_filter: KeyValuePair[];
  liste_groupe_filter: Groupe[];
  liste_jour_filter: string[];
}

export interface CoursPageData {
  refs: CoursReferencesVm;
  list: Cours_VM[];
  activeSaison: Saison | null;
}

export interface CoursPageVm extends CoursPageData {
  loading: boolean;
  filter: CoursFilterVm;
  selectedFilter: string | null;
  selectedSort: 'nom' | 'jour' | 'lieu' | null;
  selectedSortSens: 'ASC' | 'DESC';
  showFilterPanel: boolean;
  showSortPanel: boolean;
  showScrollToTop: boolean;
  editCours: Cours_VM | null;
  readonly: boolean;
  isValid: boolean;
  lastLoadedAt: number | null;
  refreshAvailable: boolean;
  pendingCount: number;
  action: string;
multiSelectMode: boolean;
selectedIds: number[];
}
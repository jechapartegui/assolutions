import { Saison } from '@shared/index';

export type Saison_VM = Saison;

export type SaisonSortField = 'nom' | 'date_debut' | 'date_fin' | 'active';
export type SortDirection = 'ASC' | 'DESC';

export interface SaisonPageVm {
  list: Saison_VM[];
  filteredList: Saison_VM[];
  editSaison: Saison_VM | null;

  loading: boolean;
  refreshing: boolean;
  action: string;

  readonly: boolean;
  isValid: boolean;

  filterNom: string;
  selectedSort: SaisonSortField;
  selectedSortSens: SortDirection;

  selectedIds: number[];

  refreshAvailable: boolean;
  lastLoadedAt: number | null;
}
import { Lieu_VM } from '@shared/index';

export type LieuSortField = 'nom' | 'adresse';
export type SortDirection = 'ASC' | 'DESC';

export interface LieuPageVm {
  list: Lieu_VM[];
  filteredList: Lieu_VM[];
  loading: boolean;
  refreshing: boolean;
  refreshAvailable: boolean;
  filterNom: string;
  selectedSort: LieuSortField;
  selectedSortSens: SortDirection;
  editLieu: Lieu_VM | null;
  readonly: boolean;
  isValid: boolean;
  selectedIds: number[];
  action: string;
  lastLoadedAt: number | null;
}
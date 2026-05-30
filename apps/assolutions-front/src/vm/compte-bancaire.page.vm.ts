import { CompteBancaire_VM } from '@shared/lib/compte-bancaire.interface';

export type CompteBancaireSortField = 'nom' | 'type' | 'actif';
export type SortDirection = 'ASC' | 'DESC';

export interface CompteBancairePageVm {
  list: CompteBancaire_VM[];
  filteredList: CompteBancaire_VM[];
  editCompteBancaire: CompteBancaire_VM | null;

  loading: boolean;
  refreshing: boolean;
  action: string;

  readonly: boolean;
  isValid: boolean;

  filterNom: string;
  selectedSort: CompteBancaireSortField;
  selectedSortSens: SortDirection;

  selectedIds: number[];

  refreshAvailable: boolean;
  lastLoadedAt: number | null;
}
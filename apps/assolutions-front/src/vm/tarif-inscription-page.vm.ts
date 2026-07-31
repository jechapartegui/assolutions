import {
  Groupe,
  TarifInscription,
} from '@shared/index';

export interface TarifInscriptionPageVm {
  tarifs: TarifInscription[];
  groupes: Groupe[];

  activeSaisonId: number | null;

  loading: boolean;
  action: string;

  selectedTarifId: number | null;
  editTarif: TarifInscription | null;

  filter: string;
  showInactive: boolean;
}

export function createInitialTarifInscriptionPageVm():
  TarifInscriptionPageVm {
  return {
    tarifs: [],
    groupes: [],
    activeSaisonId: null,
    loading: false,
    action: '',
    selectedTarifId: null,
    editTarif: null,
    filter: '',
    showInactive: false,
  };
}

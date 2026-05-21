import { Groupe } from '@shared/index';
import { AdherentListItem_VM } from '../vm/adherent-page.vm';


export interface GroupePageVm {
  groupes: Groupe[];
  adherents: AdherentListItem_VM[];
  activeSaisonId: number | null;
  loading: boolean;
  action: string;
  selectedGroupeId: number | null;
  editGroupe: Groupe | null;
  filterAdherent: string;
  adherentToAddId: number | null;
}

export function createInitialGroupePageVm(): GroupePageVm {
  return {
    groupes: [],
    adherents: [],
    activeSaisonId: null,
    loading: false,
    action: '',
    selectedGroupeId: null,
    editGroupe: null,
    filterAdherent: '',
    adherentToAddId: null,
  };
}

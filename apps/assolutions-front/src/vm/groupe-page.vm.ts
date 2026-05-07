import { AdherentListItem_VM } from '../vm/adherent-page.vm';

export interface GroupeListItem_VM {
  id: number;
  nom: string;
  whatsapp: string;
  prive: boolean;
  saison_id: number;
}

export interface GroupeEditVm {
  id: number;
  nom: string;
  whatsapp: string;
  prive: boolean;
}

export interface GroupePageVm {
  groupes: GroupeListItem_VM[];
  adherents: AdherentListItem_VM[];
  activeSaisonId: number | null;
  loading: boolean;
  action: string;
  selectedGroupeId: number | null;
  editGroupe: GroupeEditVm | null;
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

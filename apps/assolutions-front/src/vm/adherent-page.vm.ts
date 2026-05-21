import { Personne_VM } from '@shared/lib/personne.interface';
import { Saison } from '@shared/lib/saison.interface';
import { InscriptionSaison } from '@shared/lib/inscription-saison.interface';
import { InscriptionSeance } from '@shared/lib/inscription-seance.interface';
import { Groupe, LienGroupe_VM } from '@shared/lib/groupes.interface';
import { AddInfoFormItem_VM } from '@shared/lib/addinfo.interface';

export class AdherentFilterVm {
  filter_nom: string | null = null;
  filter_archive: boolean | null = null;
  filter_inscrit: boolean | null = true;
  filter_sexe: boolean | null = null;
  filter_groupe: string | null = null;
  filter_date_naissance_apres: string | null = null;
  filter_date_naissance_avant: string | null = null;

  reset(): void {
    this.filter_nom = null;
    this.filter_archive = null;
    this.filter_inscrit = true;
    this.filter_groupe = null;
    this.filter_sexe = null;
    this.filter_date_naissance_apres = null;
    this.filter_date_naissance_avant = null;
  }
}

export interface AdherentReferencesVm {
  listeSaison: Saison[];
  liste_groupe_filter: Groupe[];
  listeArchive: { key: boolean; value: string }[];
}

export class AdherentListItem_VM extends Personne_VM {
  inscrit: boolean = false;
  saisonActiveId: number | null = null;
  groupesActifs: LienGroupe_VM[] = [];
  nbInscriptionsSeance: number = 0;
}

export class AdherentDetail_VM extends Personne_VM {
  inscrit: boolean = false;
  inscriptionsSaison: InscriptionSaison[] = [];
  inscriptionsSeance: InscriptionSeance[] = [];
  groupesParSaison: LienGroupe_VM[] = [];
  addInfos: AddInfoFormItem_VM[] = [];
}

export interface AdherentPageData {
  refs: AdherentReferencesVm;
  list: AdherentListItem_VM[];
  activeSaison: Saison | null;
}

export interface AdherentPageVm extends AdherentPageData {
  loading: boolean;

  filter: AdherentFilterVm;
  selectedFilter: 'nom' | 'prenom' | 'groupe' | 'inscrit' | 'archive' | 'date_naissance';
  selectedSort: 'nom' | 'sexe' | 'date_naissance';
  selectedSortSens: 'ASC' | 'DESC';

  showFilterPanel: boolean;
  showSortPanel: boolean;
  showScrollToTop: boolean;

  editAdherent: AdherentDetail_VM | null;
  readonly: boolean;
  isValid: boolean;

  lastLoadedAt: number | null;
  refreshAvailable: boolean;
  pendingCount: number;
  action: string;

  multiSelectMode: boolean;
  selectedIds: number[];
}
export type SouscriptionStatut =
  | 'BROUILLON'
  | 'EN_ATTENTE_PAIEMENT'
  | 'PAYEE'
  | 'FINALISEE'
  | 'ANNULEE'
  | 'ERREUR';

export type SouscriptionLigneStatut =
  | 'BROUILLON'
  | 'PAYEE'
  | 'ACTIVE'
  | 'ANNULEE';

export type CodePromoTypeRemise = 'POURCENTAGE' | 'MONTANT';

export interface SouscriptionGroupeOption {
  id: number;
  nom: string;
  /** Compatibilité transitoire : toujours false, aucun groupe n'est imposé. */
  par_defaut: boolean;
  visible: boolean;
  eligible: boolean;
  complet: boolean;
  raison_indisponibilite?: string | null;
  nb_actifs: number;
  limit_nb?: number | null;
}

export interface SouscriptionTarifOption {
  id: number;
  nom: string;
  prix_centimes: number;
  paiement_plusieurs_fois: number;
  general: boolean;
  groupe_ids: number[];
  eligible: boolean;
  raison_indisponibilite?: string | null;
}

export interface SouscriptionPersonneContexte {
  id: number;
  first_name: string;
  last_name: string;
  nickname?: string | null;
  date_naissance: string;
  address: string;
  email?: string | null;
  telephone?: string | null;
  age_civil: number;
  reinscription: boolean;
  informations_completes: boolean;
  champs_manquants: string[];
  groupe_ids_precedents: number[];
  groupes: SouscriptionGroupeOption[];
  tarifs: SouscriptionTarifOption[];
}

export interface SouscriptionContexte {
  saison: {
    id: number;
    nom: string;
    date_debut: string;
    date_fin: string;
    saison_precedente?: number | null;
  };
  personnes: SouscriptionPersonneContexte[];
  brouillon?: SouscriptionView | null;
}

export interface SouscriptionPersonneChoixDto {
  personne_id: number;
  groupe_ids: number[];
  tarif_inscription_id: number;
}

export interface SaveSouscriptionDto {
  saison_id: number;
  payeur_personne_id: number;
  nb_echeances: number;
  code_promo?: string | null;
  personnes: SouscriptionPersonneChoixDto[];
}

export interface CompleteSouscriptionPersonneDto {
  first_name: string;
  last_name: string;
  date_naissance: string;
  address: string;
  email: string;
  telephone: string;
}

export interface SouscriptionPersonneView {
  id: number;
  personne_id: number;
  personne_nom: string;
  tarif_inscription_id: number;
  tarif_nom: string;
  groupe_ids: number[];
  groupes_noms: string[];
  prix_initial_centimes: number;
  remise_centimes: number;
  prix_final_centimes: number;
  statut: SouscriptionLigneStatut;
  inscription_saison_id?: number | null;
}

export interface SouscriptionView {
  id: number;
  project_id: number;
  saison_id: number;
  compte_id: number;
  payeur_personne_id: number;
  statut: SouscriptionStatut;
  montant_initial_centimes: number;
  montant_remise_centimes: number;
  montant_total_centimes: number;
  nb_echeances: number;
  code_promo_id?: number | null;
  code_promo_applique?: string | null;
  helloasso_checkout_intent_id?: number | null;
  helloasso_order_id?: number | null;
  helloasso_redirect_url?: string | null;
  helloasso_payment_state?: string | null;
  created_at: string | Date;
  updated_at?: string | Date | null;
  paid_at?: string | Date | null;
  finalized_at?: string | Date | null;
  personnes: SouscriptionPersonneView[];
}

export interface SouscriptionCheckoutResponse {
  souscription: SouscriptionView;
  redirectUrl: string | null;
}

export interface SouscriptionConfirmationResponse {
  souscription: SouscriptionView;
  paiement_confirme: boolean;
  message: string;
}

export interface CodePromoValidationView {
  valide: boolean;
  code?: string | null;
  libelle?: string | null;
  montant_remise_centimes: number;
  message?: string | null;
}

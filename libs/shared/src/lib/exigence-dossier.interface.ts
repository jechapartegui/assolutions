export type ExigenceUsage = 'INSCRIPTION' | 'LICENCE';
export type ExigenceType =
  | 'CHAMP_PERSONNE'
  | 'CONTACT'
  | 'DOCUMENT'
  | 'PREUVE_MEDICALE'
  | 'CONSENTEMENT'
  | 'DECLARATION';
export type ExigenceReponseType =
  | 'AUCUNE'
  | 'BOOLEEN'
  | 'TEXTE'
  | 'DATE'
  | 'DOCUMENT';
export type ExigencePorteeType = 'GENERAL' | 'GROUPE' | 'TARIF' | 'TYPE_LICENCE';
export type TypeLicence = 'LOISIR' | 'COMPETITION';

export interface ExigenceDossierPortee {
  id?: number;
  exigence_id?: number;
  type_portee: ExigencePorteeType;
  cible_id: number | null;
  cible_code: string | null;
  obligatoire_override?: boolean | null;
  bloquante_override?: boolean | null;
}

export interface ExigenceDossier {
  id: number;
  project_id: number;
  saison_id: number | null;
  code: string;
  libelle: string;
  description: string | null;
  usage: ExigenceUsage;
  type_exigence: ExigenceType;
  source_code: string | null;
  type_reponse: ExigenceReponseType;
  obligatoire: boolean;
  bloquante: boolean;
  age_min: number | null;
  age_max: number | null;
  validite_mois: number | null;
  texte_consentement: string | null;
  version_texte: string | null;
  ordre: number;
  actif: boolean;
  portees: ExigenceDossierPortee[];
}

export type SaveExigenceDossierDto = Omit<
  ExigenceDossier,
  'id' | 'project_id'
>;

export interface EvaluerDossierPersonneDto {
  saison_id: number;
  personne_id: number;
  groupe_ids: number[];
  tarif_inscription_id?: number | null;
  type_licence?: TypeLicence | null;
}

export interface SauverReponseExigenceDto extends EvaluerDossierPersonneDto {
  exigence_id: number;
  valeur_boolean?: boolean | null;
  valeur_texte?: string | null;
  valeur_date?: string | null;
  document_id?: number | null;
  repondu_par_personne_id?: number | null;
}

export interface ExigenceEvaluation {
  id: number;
  code: string;
  libelle: string;
  description: string | null;
  usage: ExigenceUsage;
  type_exigence: ExigenceType;
  source_code: string | null;
  type_reponse: ExigenceReponseType;
  obligatoire: boolean;
  bloquante: boolean;
  concerne_licence: boolean;
  texte_consentement: string | null;
  version_texte: string | null;
  satisfait: boolean;
  repondu: boolean;
  raison: string | null;
  valeur_boolean: boolean | null;
  valeur_texte: string | null;
  valeur_date: string | null;
  document_id: number | null;
}

export interface DossierPersonneEvaluation {
  personne_id: number;
  saison_id: number;
  inscription_complete: boolean;
  licence_complete: boolean;
  exigences_manquantes_bloquantes: string[];
  exigences_licence_manquantes: string[];
  exigences: ExigenceEvaluation[];
  preuve_medicale?: EvaluationPreuveMedicale | null;
}

export interface PreuveMedicale {
  id: number;
  project_id: number;
  personne_id: number;
  saison_id: number;
  type_preuve: 'CERTIFICAT' | 'QS_SPORT';
  date_document: string;
  qs_reponses_negatives: boolean | null;
  valable_competition: boolean;
  medecin_nom: string | null;
  medecin_rpps: string | null;
  document_id: number | null;
  valide: boolean;
  commentaire: string | null;
}

export interface SavePreuveMedicaleDto {
  personne_id: number;
  saison_id: number;
  type_preuve: 'CERTIFICAT' | 'QS_SPORT';
  date_document: string;
  qs_reponses_negatives?: boolean | null;
  valable_competition: boolean;
  medecin_nom?: string | null;
  medecin_rpps?: string | null;
  document_id?: number | null;
  commentaire?: string | null;
}

export interface EvaluationPreuveMedicale {
  /** Éligibilité correspondant au contexte demandé : loisir ou compétition. */
  eligible: boolean;
  statut: string;
  message: string;
  /** Règle standard/loisir : le QS Sport suffit chez l'adulte comme chez le mineur, sauf réponse positive. */
  dossier_eligible: boolean;
  /** Règle compétition : QS Sport chez le mineur ; certificat obligatoire chez l'adulte. */
  compatible_competition: boolean;
  message_dossier: string;
  message_competition: string;
  /** Âge civil au début de la saison, utilisé avec le type de licence pour choisir le parcours médical. */
  age: number;
  mineur: boolean;
  certificat: PreuveMedicale | null;
  qs_sport: PreuveMedicale | null;
}

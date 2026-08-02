export type ExigenceUsage = 'INSCRIPTION' | 'LICENCE';
export type ExigenceType =
  | 'CHAMP_PERSONNE'
  | 'CONTACT'
  | 'DOCUMENT'
  | 'CONSENTEMENT'
  | 'DECLARATION';
export type ExigenceReponseType =
  | 'AUCUNE'
  | 'BOOLEEN'
  | 'TEXTE'
  | 'DATE'
  | 'DOCUMENT';
export type ExigencePorteeType = 'GENERAL' | 'GROUPE' | 'TARIF' | 'TYPE_LICENCE';

export interface ExigenceDossierPortee {
  id?: number;
  exigence_id?: number;
  type_portee: ExigencePorteeType;
  cible_id: number | null;
  cible_code: string | null;
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

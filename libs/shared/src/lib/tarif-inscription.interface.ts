export interface TarifInscription {
  id: number;
  saison_id: number;

  nom: string;

  /**
   * Montant stocké en centimes.
   * Exemple : 160 € = 16000.
   */
  prix_centimes: number;

  /** Compte bancaire recevant la recette générée à la confirmation. */
  compte_bancaire_id?: number | null;

  /**
   * Dates au format YYYY-MM-DD.
   * Les bornes sont inclusives.
   */
  date_debut_validite?: string | null;
  date_fin_validite?: string | null;

  /**
   * true = tarif réservé aux personnes déjà inscrites
   * lors de la saison précédente.
   * false = pas de restriction de réinscription.
   */
  reinscription: boolean;

  /**
   * Nombre maximal d'échéances proposées.
   * 1 = paiement comptant uniquement.
   * 3 = paiement en 1, 2 ou 3 fois.
   */
  paiement_plusieurs_fois: number;

  age_min?: number | null;
  age_max?: number | null;

  /**
   * Exemple :
   * naissance_avant = 2008
   * naissance_apres = 2013
   * => personnes nées entre 2008 et 2013 inclus.
   */
  naissance_avant?: number | null;
  naissance_apres?: number | null;

  /** Nombre maximal de souscriptions utilisant ce tarif. */
  limit_nb?: number | null;

  actif: boolean;
  ordre: number;

  /**
   * Aucun groupe = tarif général.
   * Un ou plusieurs groupes = tarif explicitement proposé pour ces groupes.
   */
  groupe_ids: number[];

  date_creation?: string | Date;
  date_maj?: string | Date;
}

export type CreateTarifInscriptionDto = Omit<
  TarifInscription,
  'id' | 'date_creation' | 'date_maj'
>;

export type UpdateTarifInscriptionDto = Partial<CreateTarifInscriptionDto>;
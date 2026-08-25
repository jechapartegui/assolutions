export interface Saison {
  id: number;
  project_id: number;

  nom: string;
  active?: boolean;

  date_debut: string;
  date_fin: string;
  saison_precedente?: number;

  /**
   * false (défaut) : groupes puis tarif compatible.
   * true : tarif puis groupes accessibles avec ce tarif.
   */
  tarif_avant_groupes?: boolean;
}

export type CreateSaisonDto = Omit<Saison, 'id' | 'project_id'>;
export type UpdateSaisonDto = Partial<Omit<Saison, 'id' | 'project_id'>>;

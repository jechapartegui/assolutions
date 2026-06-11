import { GenericLink_VM } from './liens.interface';
import { Operation_VM } from './operation.interface';
import { Saison } from './saison.interface';
import { Stock_VM } from './stock.interface';

export interface FluxFinancier {
  id: number;
  project_id: number;

  libelle: string;
  date: string;
  destinataire: string;

  recette: boolean;
  statut: number;
  montant: number;

  info?: string | null;

  saison_id: number;
  /** Nouveau champ cible. */
  classe_comptable_id?: number | null;

  nb_paiement: number;

  type_frais?: string | null;

  personne_id?: number | null;
  contrat_prof_id?: number | null;

  flux_systeme?: boolean;
  origine?: string | null;
}

export type CreateFluxFinancierDto = Omit<FluxFinancier, 'id' | 'project_id'>;
export type UpdateFluxFinancierDto = Partial<Omit<FluxFinancier, 'id' | 'project_id'>>;

export class FluxFinancier_VM {
  id = 0;

  libelle!: string;
  date!: Date;

  classe_comptable?: number | null;
  classe_comptable_id?: number | null;

  type_depense!: string;
  type_frais?: string | null;

  destinataire!: GenericLink_VM;

  recette!: boolean;
  statut!: number;
  montant!: number;

  info?: string | null;

  saison_id?: number | null;
  saison?: Saison;

  personne_id?: number | null;
  contrat_prof_id?: number | null;

  flux_systeme?: boolean;
  origine?: string | null;

  liste_operation: Operation_VM[] = [];
  liste_stock: Stock_VM[] = [];

  nb_paiement = 1;

  Documents: any[] = [];

  temp_id = 0;
}

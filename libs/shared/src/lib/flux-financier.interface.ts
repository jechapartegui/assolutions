import { GenericLink_VM } from "./liens.interface";
import { Operation_VM } from "./operation.interface";
import { Saison_VM } from "./saison.interface";
import { Stock_VM } from "./stock.interface";
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
  classe_comptable: number;

  type_frais?: string | null;
}

export type CreateFluxFinancierDto = Omit<FluxFinancier, 'id' | 'project_id'>;
export type UpdateFluxFinancierDto = Partial<Omit<FluxFinancier, 'id' | 'project_id'>>;

export class FluxFinancier_VM {
id = 0;
libelle!: string;
date!: Date; // YYYY-MM-DD
classe_comptable!: number; // code, e.g., '645'
type_depense!: string; // code, e.g., '645'
destinataire!: GenericLink_VM; // parsed recipient
recette!: boolean;
statut!: number;
montant!: number;
info?: string;
saison_id?: number | null;
saison?: Saison_VM;
liste_operation:Operation_VM[]=[];
liste_stock:Stock_VM[]=[];
nb_paiement:number = 1;
Documents:any[];
temp_id:number = 0;
}
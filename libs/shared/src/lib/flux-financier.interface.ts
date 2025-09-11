import { GenericLink_VM } from "./liens.interface";
import { Operation_VM } from "./operation.interface";
import { Saison_VM } from "./saison.interface";
import { Stock_VM } from "./stock.interface";

export class FluxFinancier_VM {
id = 0;
libelle!: string;
date!: Date; // YYYY-MM-DD
classe_comptable!: string; // code, e.g., '645'
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
temp_id:number;
}
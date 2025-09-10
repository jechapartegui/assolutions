import { GenericLink_VM } from "./liens.interface";
import { Saison_VM } from "./saison.interface";

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
}
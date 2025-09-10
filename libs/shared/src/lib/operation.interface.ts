import { CompteBancaire_VM } from "./compte-bancaire.interface";
import { FluxFinancier_VM } from "./flux-financier.interface";
import { GenericLink_VM } from "./liens.interface";

export class Operation_VM {
id = 0;
solde!: number;
date_operation!: string; // YYYY-MM-DD
mode!: string;
destinataire!: GenericLink_VM; // parsed recipient
paiement_execute!: boolean;
compte_bancaire_id!: number;
compte_bancaire?: CompteBancaire_VM;
flux_financier_id!: number;
flux_financier?: FluxFinancier_VM
info?: string;
}
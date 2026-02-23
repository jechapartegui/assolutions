import { CompteBancaire_VM } from "./compte-bancaire.interface";
import { FluxFinancier_VM } from "./flux-financier.interface";
import { GenericLink_VM } from "./liens.interface";

export class Operation_VM {
id = 0;
solde!: number;
date_operation!: Date; // YYYY-MM-DD
mode!: number;
destinataire!: GenericLink_VM; // parsed recipient
paiement_execute!: boolean;
compte_bancaire_id!: number;
compte_bancaire?: CompteBancaire_VM;
flux_financier_id!: number;
flux_financier?: FluxFinancier_VM
info?: string;
temp_id:number;
}

export interface Operation {
  id: number;
  project_id: number;

  solde: number;
  date_operation: string;

  mode: number;
  destinataire: string;

  paiement_execute: boolean;

  compte_bancaire_id: number;
  flux_financier_id: number;

  info?: string | null;
}

export type CreateOperationDto = Omit<Operation, 'id' | 'project_id'>;
export type UpdateOperationDto = Partial<Omit<Operation, 'id' | 'project_id'>>;

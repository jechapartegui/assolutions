import { CompteBancaire_VM } from './compte-bancaire.interface';
import { FluxFinancier_VM } from './flux-financier.interface';
import { GenericLink_VM } from './liens.interface';

export interface Operation {
  id: number;

  solde: number;
  date_operation: string;
  date_previsionnelle?: string | null;

  mode: number;
  destinataire: string;
  paiement_execute: boolean;

  compte_bancaire_id: number;

  /**
   * Toujours rempli côté back après import :
   * - soit vrai flux
   * - soit flux système "À classer"
   */
  flux_financier_id?: number | null;

  /**
   * Nécessaire à l'import si flux_financier_id absent.
   * Permet au back de créer/récupérer le flux système de la saison.
   */
  saison_id?: number | null;

  libelle_bancaire?: string | null;
  import_key?: string | null;
  source_import?: string | null;

  info?: string | null;
}

export type CreateOperationDto = Omit<Operation, 'id'>;
export type UpdateOperationDto = Partial<Omit<Operation, 'id'>>;

export class Operation_VM {
  id = 0;

  solde!: number;

  date_operation!: Date;
  date_previsionnelle?: Date | null;

  mode!: number;

  destinataire!: GenericLink_VM;

  paiement_execute!: boolean;

  compte_bancaire_id!: number;
  compte_bancaire?: CompteBancaire_VM;

  flux_financier_id?: number | null;
  flux_financier?: FluxFinancier_VM;

  saison_id?: number | null;

  libelle_bancaire?: string | null;
  import_key?: string | null;
  source_import?: string | null;

  info?: string | null;

  temp_id = 0;
}
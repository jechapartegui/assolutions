import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';

export type SouscriptionMonitorLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface SouscriptionMonitorListItem {
  id: number;
  statut: string;
  payment_state: string | null;
  saison_id: number;
  saison_nom: string;
  compte_id: number;
  compte_login: string | null;
  payeur: string | null;
  payeur_email: string | null;
  personnes: string[];
  personne_ids: number[];
  montant_total_centimes: number;
  nb_echeances: number;
  checkout_intent_id: number | null;
  order_id: number | null;
  created_at: string;
  updated_at: string | null;
  paid_at: string | null;
  finalized_at: string | null;
  canceled_at: string | null;
  error_message: string | null;
  dossier_complet: boolean;
  warnings: string[];
}

export interface SouscriptionMonitorTimelineItem {
  type: string;
  label: string;
  created_at: string;
  level: SouscriptionMonitorLevel;
  details: unknown;
}

export interface SouscriptionMonitorDetail {
  souscription: {
    id: number;
    statut: string;
    payment_state?: string | null;
    helloasso_payment_state: string | null;
    helloasso_checkout_intent_id: number | null;
    helloasso_order_id: number | null;
    montant_initial_centimes: number;
    montant_remise_centimes: number;
    montant_total_centimes: number;
    nb_echeances: number;
    code_promo_applique: string | null;
    payeur_prenom: string | null;
    payeur_nom: string | null;
    payeur_email: string | null;
    created_at: string;
    updated_at: string | null;
    paid_at: string | null;
    finalized_at: string | null;
    canceled_at: string | null;
    error_message: string | null;
  };
  compte: { id: number; login: string } | null;
  saison: { id: number; nom: string } | null;
  personnes: Array<{
    id: number;
    personne_id: number;
    personne_nom: string;
    statut: string;
    type_licence: string;
    dossier_complet: boolean;
    informations_validees_at: string | null;
    tarif: { id: number; nom: string } | null;
    groupes: Array<{ id: number; nom: string }>;
    prix_initial_centimes: number;
    remise_centimes: number;
    prix_final_centimes: number;
    inscription_saison_id: number | null;
    inscription_active: boolean | null;
    exigences: Array<{
      id: string;
      exigence_id: number;
      libelle: string;
      type_exigence: string | null;
      obligatoire: boolean | null;
      bloquante: boolean | null;
      repondue_at: string;
      document_id: number | null;
      has_value: boolean;
    }>;
  }>;
  timeline: SouscriptionMonitorTimelineItem[];
  finance: {
    flux_id: number;
    origine: string | null;
    montant: number;
    date: string;
    operations: Array<{
      id: number;
      solde: number;
      date_operation: string;
      paiement_execute: boolean;
      libelle_bancaire: string | null;
    }>;
  } | null;
  warnings: string[];
}

@Injectable({ providedIn: 'root' })
export class SouscriptionMonitorApiService {
  private readonly base = '/souscriptions/admin/suivi';

  constructor(private readonly api: ApiClientService) {}

  list(): Promise<SouscriptionMonitorListItem[]> {
    return this.api.GET<SouscriptionMonitorListItem[]>(this.base);
  }

  detail(id: number): Promise<SouscriptionMonitorDetail> {
    return this.api.GET<SouscriptionMonitorDetail>(`${this.base}/${id}`);
  }
}

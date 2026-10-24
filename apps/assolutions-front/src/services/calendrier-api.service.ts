import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';

export interface Calendrier {
  id: number;
  project_id: number;
  saison_id: number;
  nom: string;
  description: string | null;
  timezone: string;
  notifier_mises_a_jour: boolean;
  actif: boolean;
  google_calendar_id: string | null;
  google_calendar_url: string | null;
  statut_synchro: string;
  derniere_synchro: string | null;
  derniere_erreur: string | null;
  groupe_ids: number[];
  seance_ids?: number[];
  nb_seances?: number;
}
export interface CalendrierPayload {
  saison_id?: number;
  nom: string;
  description: string | null;
  timezone: string;
  notifier_mises_a_jour: boolean;
  groupe_ids: number[];
  seance_ids: number[];
}
export interface CalendrierSeance {
  seance_id: number;
  date_seance: string;
  heure_debut: string;
  duree_seance: number;
  label: string | null;
  type_seance: string;
  statut: string;
  calendrier_id: number | null;
  groupes: string;
  statut_synchro: string | null;
  derniere_erreur: string | null;
}
/** EXG-UI-02 : calendrier accessible au compte, réponse par personne éligible. */
export interface MesCalendriersPersonne {
  id: number;
  nom: string;
  statut_inscription: string | null;
}
export interface MesCalendriersEvenement {
  calendrier_id: number;
  seance_id: number;
  date_seance: string;
  heure_debut: string;
  duree_seance: number;
  label: string | null;
  type_seance: string;
  statut: string;
  lieu_nom: string | null;
  groupes: string;
  peut_repondre: boolean;
  personnes: MesCalendriersPersonne[];
}

export interface CalendrierPreview {
  calendrier_id: number;
  saison_id: number;
  nb_comptes: number;
  nb_seances: number;
  nb_evenements_a_supprimer?: number;
  avertissement: string;
}
export interface CalendrierSyncResult {
  calendrier_id: number;
  google_calendar_id: string;
  notif_google_demandees: boolean;
  traites: number;
  succes: number;
  erreurs: number;
  restants: number;
  avertissement: string;
}

export interface CalendrierWorkerEtat {
  calendrier_trouve: boolean;
  calendrier_id?: number;
  statut_calendrier?: string;
  evenements_pending?: number;
  google_configure?: boolean;
  auto_sync_configure?: boolean;
  worker_demarre?: boolean;
  worker_en_cours?: boolean;
  filtre_valide?: boolean;
  calendrier_dans_filtre?: boolean;
  calendrier_google_existant?: boolean;
  calendrier_actif?: boolean;
  eligibilite?: boolean;
  dernier_passage?: string | null;
  dernier_resultat?: string;
  derniers_calendriers_trouves?: number;
}

@Injectable({ providedIn: 'root' })
export class CalendrierApiService {
  private readonly base = '/calendriers';
  constructor(private readonly api: ApiClientService) {}

  googleStatus(): Promise<{
    actif: boolean; credentials_present: boolean; proprietaire_verifie: boolean;
    compte?: string; code: string;
  }> {
    return this.api.GET(this.base + '/google/etat');
  }
  workerStatus(calendrierId: number): Promise<CalendrierWorkerEtat> {
    return this.api.GET<CalendrierWorkerEtat>(
      this.base + '/google/worker-etat?calendrier_id=' + Number(calendrierId),
    );
  }

  list(saisonId: number): Promise<Calendrier[]> {
    return this.api.GET<Calendrier[]>(this.base + '?saison_id=' + Number(saisonId));
  }
  get(id: number): Promise<Calendrier> {
    return this.api.GET<Calendrier>(this.base + '/' + Number(id));
  }
  mes(): Promise<Calendrier[]> {
    return this.api.GET<Calendrier[]>(this.base + '/mes');
  }
  mesExiste(): Promise<{ existe: boolean }> {
    return this.api.GET<{ existe: boolean }>(this.base + '/mes/existe');
  }
  mesEvenements(): Promise<MesCalendriersEvenement[]> {
    return this.api.GET<MesCalendriersEvenement[]>(this.base + '/mes/evenements');
  }

  repondreEvenement(seanceId: number, personneId: number, reponse: 'présent' | 'absent'):
    Promise<{ seance_id: number; personne_id: number; statut_inscription: string }> {
    return this.api.POST(this.base + '/mes/evenements/' + Number(seanceId) + '/repondre',
      { personne_id: Number(personneId), reponse });
  }
  seances(id: number): Promise<CalendrierSeance[]> {
    return this.api.GET<CalendrierSeance[]>(this.base + '/' + Number(id) + '/seances');
  }
  create(dto: CalendrierPayload & { saison_id: number }): Promise<{ id: number }> {
    return this.api.POST<{ id: number }>(this.base, dto);
  }
  update(id: number, dto: Omit<CalendrierPayload, 'saison_id'>): Promise<{ id: number }> {
    // Defense supplementaire : seuls les champs admis par UpdateCalendrierDto
    // sont transmis, meme si l'appelant inclut accidentellement saison_id.
    const { nom, description, timezone, notifier_mises_a_jour, groupe_ids, seance_ids } = dto;
    return this.api.POST<{ id: number }>(this.base + '/' + Number(id) + '/update',
      { nom, description, timezone, notifier_mises_a_jour, groupe_ids, seance_ids });
  }
  archive(id: number): Promise<{ id: number; archived: true }> {
    return this.api.POST<{ id: number; archived: true }>(this.base + '/' + Number(id) + '/archive', {});
  }
  preview(id: number): Promise<CalendrierPreview> {
    return this.api.GET<CalendrierPreview>(this.base + '/' + Number(id) + '/preview');
  }
  sync(id: number, notifier: boolean): Promise<CalendrierSyncResult> {
    return this.api.POST<CalendrierSyncResult>(
      this.base + '/' + Number(id) + '/synchroniser', { notifier, mode: 'execute' },
    );
  }
  importerReponses(id: number, lignes: Array<{
    seance_id: number; personne_id: number;
    google_email: string; google_reponse: 'accepted' | 'declined';
  }>): Promise<{ importees: number }> {
    return this.api.POST<{ importees: number }>(
      this.base + '/' + Number(id) + '/importer-reponses', { lignes },
    );
  }
  responses(id: number): Promise<any> {
    return this.api.GET<any>(this.base + '/' + Number(id) + '/reponses-google');
  }
}

import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Seance, CreateSeanceDto, UpdateSeanceDto } from '@shared/lib/seance.interface';

@Injectable({ providedIn: 'root' })
export class SeanceApiService {
  private readonly base = '/seances';

  constructor(private api: ApiClientService) {}

  list(saisonId: number): Promise<Seance[]> {
    return this.api.GET<Seance[]>(`${this.base}/saison/${saisonId}`);
  }

  addrange(
    dto: CreateSeanceDto,
    dateDebut: Date,
    dateFin: Date,
    jourSemaine: string,
  ): Promise<number[]> {
    const payload = {
      seances: this.toPayload(dto),
      dateDebut: this.toDateOnly(dateDebut),
      dateFin: this.toDateOnly(dateFin),
      jourSemaine,
    };
    return this.api.POST<number[]>(`${this.base}/addrange`, payload);
  }

  get(id: number): Promise<Seance> {
    return this.api.GET<Seance>(`${this.base}/${id}`);
  }

  create(dto: CreateSeanceDto): Promise<Seance> {
    return this.api.POST<Seance>(this.base, this.toPayload(dto));
  }

  update(id: number, dto: UpdateSeanceDto): Promise<Seance> {
    return this.api.POST<Seance>(`${this.base}/${id}/update`, this.toPayload(dto));
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }

  get_seance_by_ids(ids: number[]): Promise<Seance[]> {
    const url = `${this.base}/liste_by_ids`;
    return this.api.POST<Seance[]>(url, ids);
  }

  private toPayload(dto: any): Record<string, unknown> {
    return {
      saison_id: dto?.saison_id,
      cours: dto?.cours,
      label: dto?.label,
      type_seance: dto?.type_seance,
      date_seance: this.normalizeDate(dto?.date_seance),
      heure_debut: dto?.heure_debut,
      duree_seance: dto?.duree_seance,
      lieu_id: dto?.lieu_id,
      statut: dto?.statut,
      age_minimum: dto?.age_minimum,
      age_maximum: dto?.age_maximum,
      place_maximum: dto?.place_maximum,
      essai_possible: dto?.essai_possible,
      nb_essai_possible: dto?.nb_essai_possible,
      info_seance: dto?.info_seance,
      convocation_nominative: dto?.convocation_nominative,
      afficher_present: dto?.afficher_present,
      appointment: dto?.appointment ?? dto?.rdv,
      est_limite_age_minimum: dto?.est_limite_age_minimum,
      est_limite_age_maximum: dto?.est_limite_age_maximum,
      est_place_maximum: dto?.est_place_maximum,
    };
  }

  private normalizeDate(value: unknown): unknown {
    return value instanceof Date ? this.toDateOnly(value) : value;
  }

  private toDateOnly(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

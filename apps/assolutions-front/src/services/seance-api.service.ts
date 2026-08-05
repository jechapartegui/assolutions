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
    // On envoie des dates calendaires et non des Date sérialisées en UTC.
    // Une date saisie à minuit en Europe/Paris pouvait sinon devenir la veille,
    // ce qui excluait artificiellement les bornes exactes de la saison.
    const payload = {
      seances: dto,
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
    return this.api.POST<Seance>(this.base, dto);
  }

  update(id: number, dto: UpdateSeanceDto): Promise<Seance> {
    return this.api.POST<Seance>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }

  get_seance_by_ids(ids: number[]): Promise<Seance[]> {
    const url = `${this.base}/liste_by_ids`;
    return this.api.POST<Seance[]>(url, ids);
  }

  private toDateOnly(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

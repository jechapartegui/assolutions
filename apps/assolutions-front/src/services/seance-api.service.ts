import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Seance, CreateSeanceDto, UpdateSeanceDto } from '@shared/lib/seance.interface';

@Injectable({ providedIn: 'root' })
export class SeanceApiService {
  private readonly base = '/seances';

  constructor(private api: ApiClientService) {}

  list(saisonId:number): Promise<Seance[]> {
    return this.api.GET<Seance[]>(`${this.base}/saison/${saisonId}`);
  }

  addrange(dto: CreateSeanceDto,dateDebut: Date, dateFin: Date, jourSemaine: string): Promise<number[]> {
    const payload = {
      seances: dto,
      dateDebut,
      dateFin,
      jourSemaine
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
}

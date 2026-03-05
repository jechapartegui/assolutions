import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Seance, CreateSeanceDto, UpdateSeanceDto } from '@shared/lib/seance.interface';

@Injectable({ providedIn: 'root' })
export class SeanceApiService {
  private readonly base = '/seances';

  constructor(private api: ApiClientService) {}

  list(): Promise<Seance[]> {
    return this.api.GET<Seance[]>(this.base);
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

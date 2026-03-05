import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Saison, CreateSaisonDto, UpdateSaisonDto } from '@shared/lib/saison.interface';

@Injectable({ providedIn: 'root' })
export class SaisonApiService {
  private readonly base = '/saisons';

  constructor(private api: ApiClientService) {}

  list(): Promise<Saison[]> {
    return this.api.GET<Saison[]>(this.base);
  }

  get(id: number): Promise<Saison> {
    return this.api.GET<Saison>(`${this.base}/${id}`);
  }

  create(dto: CreateSaisonDto): Promise<Saison> {
    return this.api.POST<Saison>(this.base, dto);
  }

  update(id: number, dto: UpdateSaisonDto): Promise<Saison> {
    return this.api.POST<Saison>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }

 
}

import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Personne, CreatePersonneDto, UpdatePersonneDto } from '@shared/lib/personne.interface';

@Injectable({ providedIn: 'root' })
export class PersonneApiService {
  private readonly base = '/personnes';

  constructor(private api: ApiClientService) {}

  listMine(): Promise<Personne[]> {
    return this.api.GET<Personne[]>(this.base);
  }

  get(id: number): Promise<Personne> {
    return this.api.GET<Personne>(`${this.base}/${id}`);
  }

  create(dto: CreatePersonneDto): Promise<Personne> {
    return this.api.POST<Personne>(this.base, dto);
  }

  update(id: number, dto: UpdatePersonneDto): Promise<Personne> {
    return this.api.POST<Personne>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}

import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Personne, CreatePersonneDto, UpdatePersonneDto, PersonneLight_VM } from '@shared/lib/personne.interface';

@Injectable({ providedIn: 'root' })
export class PersonneApiService {
  private readonly base = '/personnes';

  constructor(private api: ApiClientService) {}

  listMine(): Promise<Personne[]> {
    return this.api.GET<Personne[]>(this.base);
  }


  list_personnelight(ids: number[], includePhotos = false): Promise<PersonneLight_VM[]> {
    const url = `${this.base}/light?includePhotos=${includePhotos ? 'true' : 'false'}`;
    return this.api.POST<PersonneLight_VM[]>(url, ids);
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

  list_by_id(ids: number[]): Promise<Personne[]> {
    return this.api.POST<Personne[]>(`${this.base}/by-ids`, ids); 
  }
}

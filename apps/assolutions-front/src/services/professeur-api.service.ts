import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Professeur, CreateProfesseurDto, UpdateProfesseurDto } from '@shared/lib/professeur.interface';

@Injectable({ providedIn: 'root' })
export class ProfesseurApiService {
  private readonly base = '/professeurs';

  constructor(private api: ApiClientService) {}

  list(): Promise<Professeur[]> {
    return this.api.GET<Professeur[]>(this.base);
  }

  get(id: number): Promise<Professeur> {
    return this.api.GET<Professeur>(`${this.base}/${id}`);
  }

  create(dto: CreateProfesseurDto): Promise<Professeur> {
    return this.api.POST<Professeur>(this.base, dto);
  }

  update(id: number, dto: UpdateProfesseurDto): Promise<Professeur> {
    return this.api.POST<Professeur>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}

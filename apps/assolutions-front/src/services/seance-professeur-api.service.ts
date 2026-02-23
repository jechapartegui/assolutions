import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import {
  SeanceProfesseur,
  CreateSeanceProfesseurDto,
  UpdateSeanceProfesseurDto,
} from '@shared/lib/seance-professeur.interface';

@Injectable({ providedIn: 'root' })
export class SeanceProfesseurApiService {
  private readonly base = '/seance-professeur';

  constructor(private api: ApiClientService) {}

  list(): Promise<SeanceProfesseur[]> {
    return this.api.GET<SeanceProfesseur[]>(this.base);
  }

  get(id: number): Promise<SeanceProfesseur> {
    return this.api.GET<SeanceProfesseur>(`${this.base}/${id}`);
  }

  create(dto: CreateSeanceProfesseurDto): Promise<SeanceProfesseur> {
    return this.api.POST<SeanceProfesseur>(this.base, dto);
  }

  update(id: number, dto: UpdateSeanceProfesseurDto): Promise<SeanceProfesseur> {
    return this.api.POST<SeanceProfesseur>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}

import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import {
  SeanceProfesseur,
  CreateSeanceProfesseurDto,
  UpdateSeanceProfesseurDto,
  SeanceProfesseur_Light,
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
  get_list_by_idseance(ids: number[]): Promise<SeanceProfesseur_Light[]> {
    const url = `${this.base}/liste_by_ids_seance`;
    return this.api.POST<SeanceProfesseur_Light[]>(url, ids);
  }
    get_list_by_idcontrat(ids: number[]): Promise<SeanceProfesseur_Light[]> {
    const url = `${this.base}/liste_by_idcontrat`;
    return this.api.POST<SeanceProfesseur_Light[]>(url, ids);
  }
}

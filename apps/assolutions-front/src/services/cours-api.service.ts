import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Cours } from '@shared/lib/cours.interface';


export type CreateCoursDto = Omit<Cours, 'id'>;
export type UpdateCoursDto = Partial<Omit<Cours, 'id' | 'project_id'>> & {
  // selon ton back, tu peux laisser saison_id modifiable, ici on le laisse modifiable
};

@Injectable({ providedIn: 'root' })
export class CoursApiService {
  private readonly base = '/cours';

  constructor(private api: ApiClientService) {}

  list(saisonId: number): Promise<Cours[]> {
    return this.api.GET<Cours[]>(`${this.base}/saison/${saisonId}`);
  }

  get(id: number): Promise<Cours> {
    return this.api.GET<Cours>(`${this.base}/${id}`);
  }

  create(dto: CreateCoursDto): Promise<Cours> {
    return this.api.POST<Cours>(this.base, dto);
  }

  // ✅ UPDATE via POST
  update(id: number, dto: UpdateCoursDto): Promise<Cours> {
    return this.api.POST<Cours>(`${this.base}/${id}/update`, dto);
  }

  // ✅ DELETE via POST
  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}

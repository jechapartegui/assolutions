import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import {
  CoursProfesseur,
  CreateCoursProfesseurDto,
  UpdateCoursProfesseurDto,
} from '@shared/lib/cours-professeur.inteface';

@Injectable({ providedIn: 'root' })
export class CoursProfesseurApiService {
  private readonly base = '/cours-professeur';

  constructor(private api: ApiClientService) {}

  list(): Promise<CoursProfesseur[]> {
    return this.api.GET<CoursProfesseur[]>(this.base);
  }

  get(id: number): Promise<CoursProfesseur> {
    return this.api.GET<CoursProfesseur>(`${this.base}/${id}`);
  }

  create(dto: CreateCoursProfesseurDto): Promise<CoursProfesseur> {
    return this.api.POST<CoursProfesseur>(this.base, dto);
  }

  update(id: number, dto: UpdateCoursProfesseurDto): Promise<CoursProfesseur> {
    return this.api.POST<CoursProfesseur>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }

 listProfsByCoursId(coursId: number[]): Promise<Record<number, number[]>> {
  return this.api.POST<Record<number, number[]>>(`${this.base}/by-cours`, { coursId });
}
}

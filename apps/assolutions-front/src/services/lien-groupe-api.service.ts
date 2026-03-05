import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { LienGroupe, CreateLienGroupeDto, UpdateLienGroupeDto } from '@shared/lib/lien-groupe.interface';

@Injectable({ providedIn: 'root' })
export class LienGroupeApiService {
  private readonly base = '/lien-groupe';

  constructor(private api: ApiClientService) {}

  listGroupesByCoursId(coursId: number[]): Promise<Record<number, number[]>> {
    return this.api.POST<Record<number, number[]>>(`${this.base}/by-cours`, { coursId });
  }
  list(): Promise<LienGroupe[]> {
    return this.api.GET<LienGroupe[]>(this.base);
  }

  get(id: number): Promise<LienGroupe> {
    return this.api.GET<LienGroupe>(`${this.base}/${id}`);
  }

  create(dto: CreateLienGroupeDto): Promise<LienGroupe> {
    return this.api.POST<LienGroupe>(this.base, dto);
  }

  update(id: number, dto: UpdateLienGroupeDto): Promise<LienGroupe> {
    return this.api.POST<LienGroupe>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}

import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { LienGroupe, CreateLienGroupeDto, UpdateLienGroupeDto } from '@shared/lib/lien-groupe.interface';

@Injectable({ providedIn: 'root' })
export class LienGroupeApiService {
 
      
  private readonly base = '/lien-groupe';

  constructor(private api: ApiClientService) {}

   removeidfromgroupe(objectId: number, groupeId: number, type: string): Promise<void> {
    return this.api.POST<void>(`${this.base}/${objectId}/${groupeId}/${type}/delete`, {});
  }

  listGroupesByCoursId(coursId: number[]): Promise<Record<number, number[]>> {
    return this.api.POST<Record<number, number[]>>(`${this.base}/by-cours`, { coursId });
  }
  listGroupesBySeanceId(seanceId: number[]): Promise<Record<number, number[]>> {
    return this.api.POST<Record<number, number[]>>(`${this.base}/by-seance`, { seanceId });
  }
    listGroupesByPersonne(personneId: number[]): Promise<Record<number, number[]>> {
    return this.api.POST<Record<number, number[]>>(`${this.base}/by-personne`, { personneId });
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
  async updateGroupesForSeance(seanceId: number, groupeIds: number[]): Promise<void> {
    return this.api.POST<void>(`${this.base}/updateGroupesForSeance`, { seanceId, groupeIds });
  }

  async updateGroupesForCours(coursId: number, groupeIds: number[]): Promise<void> {
    return this.api.POST<void>(`${this.base}/updateGroupesForCours`, { coursId, groupeIds });
  }

  async lienGroupeByPersonne(personneId: number, saisonId: number): Promise<LienGroupe[]> {
    return this.api.POST<LienGroupe[]>(`${this.base}/lienGroupeByPersonne`, { personneId, saisonId });
  }
}

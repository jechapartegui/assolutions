import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import {
  InscriptionSaison,
  CreateInscriptionSaisonDto,
  UpdateInscriptionSaisonDto,
  InscriptionSaisonProjetVm,
} from '@shared/lib/inscription-saison.interface';

@Injectable({ providedIn: 'root' })
export class InscriptionSaisonApiService {
  private readonly base = '/inscription-saison';

  constructor(private api: ApiClientService) {}

  list(): Promise<InscriptionSaison[]> {
    return this.api.GET<InscriptionSaison[]>(this.base);
  }
    listsaison(saisonId: number): Promise<InscriptionSaison[]> {
    return this.api.GET<InscriptionSaison[]>(`${this.base}/saison/${saisonId}`);
  }

  listByPersonnes(personneIds: number[]): Promise<InscriptionSaisonProjetVm[]> {
  return this.api.POST<InscriptionSaisonProjetVm[]>(
    `${this.base}/by-personnes`,
    { personneIds }
  );
}
  get(id: number): Promise<InscriptionSaison> {
    return this.api.GET<InscriptionSaison>(`${this.base}/${id}`);
  }

  create(dto: CreateInscriptionSaisonDto): Promise<InscriptionSaison> {
    return this.api.POST<InscriptionSaison>(this.base, dto);
  }

  update(id: number, dto: UpdateInscriptionSaisonDto): Promise<InscriptionSaison> {
    return this.api.POST<InscriptionSaison>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }

  listForPersonne(personneId: number): Promise<InscriptionSaison[]> {
    return this.api.GET<InscriptionSaison[]>(`${this.base}/personne/${personneId}`);
  }
}

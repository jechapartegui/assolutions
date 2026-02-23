import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import {
  CompteBancaire,
  CreateCompteBancaireDto,
  UpdateCompteBancaireDto,
} from '@shared/lib/compte-bancaire.interface';

@Injectable({ providedIn: 'root' })
export class CompteBancaireApiService {
  private readonly base = '/compte-bancaire';

  constructor(private api: ApiClientService) {}

  list(): Promise<CompteBancaire[]> {
    return this.api.GET<CompteBancaire[]>(this.base);
  }

  get(id: number): Promise<CompteBancaire> {
    return this.api.GET<CompteBancaire>(`${this.base}/${id}`);
  }

  create(dto: CreateCompteBancaireDto): Promise<CompteBancaire> {
    return this.api.POST<CompteBancaire>(this.base, dto);
  }

  update(id: number, dto: UpdateCompteBancaireDto): Promise<CompteBancaire> {
    return this.api.POST<CompteBancaire>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}

import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Saison, CreateSaisonDto, UpdateSaisonDto } from '@shared/lib/saison.interface';

@Injectable({ providedIn: 'root' })
export class SaisonApiService {
  private readonly base = '/saisons';

  constructor(private api: ApiClientService) {}

  list(): Promise<Saison[]> {
    return this.api.GET<Saison[]>(this.base);
  }

  get(id: number): Promise<Saison> {
    return this.api.GET<Saison>(`${this.base}/${id}`);
  }

  create(dto: CreateSaisonDto): Promise<Saison> {
    return this.api.POST<Saison>(this.base, this.toPayload(dto));
  }

  update(id: number, dto: UpdateSaisonDto): Promise<Saison> {
    return this.api.POST<Saison>(`${this.base}/${id}/update`, this.toPayload(dto));
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }

  private toPayload(dto: any): Record<string, unknown> {
    return {
      nom: dto?.nom,
      active: dto?.active,
      date_debut: this.normalizeDate(dto?.date_debut),
      date_fin: this.normalizeDate(dto?.date_fin),
      saison_precedente: dto?.saison_precedente,
      tarif_avant_groupes: dto?.tarif_avant_groupes,
    };
  }

  private normalizeDate(value: unknown): unknown {
    if (!(value instanceof Date)) return value;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

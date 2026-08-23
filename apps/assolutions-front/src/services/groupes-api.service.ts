import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Groupe, CreateGroupeDto, UpdateGroupeDto } from '@shared/lib/groupes.interface';

@Injectable({ providedIn: 'root' })
export class GroupesApiService {
  private readonly base = '/groupes';

  constructor(private api: ApiClientService) {}

  list(saisonId: number): Promise<Groupe[]> {
    return this.api.GET<Groupe[]>(`${this.base}/saison/${saisonId}`);
  }

  get(id: number): Promise<Groupe> {
    return this.api.GET<Groupe>(`${this.base}/${id}`);
  }

  create(dto: CreateGroupeDto): Promise<Groupe> {
    return this.api.POST<Groupe>(this.base, this.toPayload(dto));
  }

  update(id: number, dto: UpdateGroupeDto): Promise<Groupe> {
    return this.api.POST<Groupe>(`${this.base}/${id}/update`, this.toPayload(dto));
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }

  private toPayload(dto: any): Record<string, unknown> {
    return {
      nom: dto?.nom,
      saison_id: dto?.saison_id,
      whatsapp: dto?.whatsapp,
      visible: dto?.visible,
      age_min: dto?.age_min,
      age_max: dto?.age_max,
      naissance_avant: dto?.naissance_avant,
      naissance_apres: dto?.naissance_apres,
      limit_nb: dto?.limit_nb,
    };
  }
}

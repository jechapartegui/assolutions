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
    return this.api.POST<Groupe>(this.base, dto);
  }

  update(id: number, dto: UpdateGroupeDto): Promise<Groupe> {
    return this.api.POST<Groupe>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}

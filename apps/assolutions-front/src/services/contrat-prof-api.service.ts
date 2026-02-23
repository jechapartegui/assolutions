import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { ContratProf, CreateContratProfDto, UpdateContratProfDto } from '@shared/lib/contrat-prof.interface';

@Injectable({ providedIn: 'root' })
export class ContratProfApiService {
  private readonly base = '/contrat-prof';

  constructor(private api: ApiClientService) {}

  list(): Promise<ContratProf[]> {
    return this.api.GET<ContratProf[]>(this.base);
  }

  get(id: number): Promise<ContratProf> {
    return this.api.GET<ContratProf>(`${this.base}/${id}`);
  }

  create(dto: CreateContratProfDto): Promise<ContratProf> {
    return this.api.POST<ContratProf>(this.base, dto);
  }

  update(id: number, dto: UpdateContratProfDto): Promise<ContratProf> {
    return this.api.POST<ContratProf>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}

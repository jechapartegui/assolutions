import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Compte, CreateCompteDto, UpdateCompteDto } from '@shared/lib/compte.interface';

@Injectable({ providedIn: 'root' })
export class CompteApiService {
  private readonly base = '/comptes';

  constructor(private api: ApiClientService) {}

  list(): Promise<Compte[]> {
    return this.api.GET<Compte[]>(this.base);
  }

  get(id: number): Promise<Compte> {
    return this.api.GET<Compte>(`${this.base}/${id}`);
  }

  create(dto: CreateCompteDto): Promise<Compte> {
    return this.api.POST<Compte>(this.base, dto);
  }

  update(id: number, dto: UpdateCompteDto): Promise<Compte> {
    return this.api.POST<Compte>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }

  check_token(login: string, token: string): Promise<Compte> {
    return this.api.POST<Compte>(`/check-token`, { login, token });
  }
}

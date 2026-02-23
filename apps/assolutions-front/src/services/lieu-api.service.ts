import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Lieu, CreateLieuDto, UpdateLieuDto } from '@shared/lib/lieu.interface';

@Injectable({ providedIn: 'root' })
export class LieuApiService {
  private readonly base = '/lieux';

  constructor(private api: ApiClientService) {}

  list(): Promise<Lieu[]> {
    return this.api.GET<Lieu[]>(this.base);
  }

  get(id: number): Promise<Lieu> {
    return this.api.GET<Lieu>(`${this.base}/${id}`);
  }

  create(dto: CreateLieuDto): Promise<Lieu> {
    return this.api.POST<Lieu>(this.base, dto);
  }

  update(id: number, dto: UpdateLieuDto): Promise<Lieu> {
    return this.api.POST<Lieu>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}

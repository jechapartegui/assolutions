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
    return this.api.POST<Lieu>(this.base, this.toPayload(dto));
  }

  update(id: number, dto: UpdateLieuDto): Promise<Lieu> {
    return this.api.POST<Lieu>(`${this.base}/${id}/update`, this.toPayload(dto));
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }

  search(search: string): Promise<Lieu[]> {
    return this.api.GET<Lieu[]>(this.base + `/search/${search}`);
  }

  private toPayload(dto: any): Record<string, unknown> {
    const adresse = dto?.adresse;
    return {
      nom: dto?.nom,
      adresse:
        typeof adresse === 'string'
          ? adresse
          : adresse == null
            ? adresse
            : JSON.stringify(adresse),
      public: dto?.public,
    };
  }
}

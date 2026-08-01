import { Injectable } from '@angular/core';
import { CodePromo, SaveCodePromoDto } from '@shared/index';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class CodePromoApiService {
  private readonly base = '/codes-promo';

  constructor(private readonly api: ApiClientService) {}

  list(saisonId: number): Promise<CodePromo[]> {
    return this.api.GET<CodePromo[]>(`${this.base}/saison/${Number(saisonId)}`);
  }

  create(dto: SaveCodePromoDto): Promise<CodePromo> {
    return this.api.POST<CodePromo>(this.base, dto);
  }

  update(id: number, dto: SaveCodePromoDto): Promise<CodePromo> {
    return this.api.POST<CodePromo>(`${this.base}/${Number(id)}`, dto);
  }

  remove(id: number): Promise<{ ok: true }> {
    return this.api.POST_DELETE<{ ok: true }>(`${this.base}/${Number(id)}/delete`);
  }
}

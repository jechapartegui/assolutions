import { Injectable } from '@angular/core';
import { ExigenceDossier, SaveExigenceDossierDto } from '@shared/index';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class ExigenceDossierApiService {
  private readonly base = '/exigences-dossier';

  constructor(private readonly api: ApiClientService) {}

  list(saisonId?: number | null): Promise<ExigenceDossier[]> {
    const suffix = saisonId ? `?saisonId=${Number(saisonId)}` : '';
    return this.api.GET<ExigenceDossier[]>(`${this.base}${suffix}`);
  }

  create(dto: SaveExigenceDossierDto): Promise<ExigenceDossier> {
    return this.api.POST<ExigenceDossier>(this.base, dto);
  }

  update(id: number, dto: SaveExigenceDossierDto): Promise<ExigenceDossier> {
    return this.api.POST<ExigenceDossier>(`${this.base}/${Number(id)}`, dto);
  }

  remove(id: number): Promise<{ ok: true }> {
    return this.api.POST_DELETE<{ ok: true }>(`${this.base}/${Number(id)}/delete`);
  }
}

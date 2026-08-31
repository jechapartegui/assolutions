import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Document, CreateDocumentDto, UpdateDocumentDto } from '@shared/lib/document.interface';

@Injectable({ providedIn: 'root' })
export class DocumentApiService {
  private readonly base = '/documents';
  private readonly photoBatchSize = 10;
  private readonly photoBatchConcurrency = 3;

  constructor(private api: ApiClientService) {}

  listRecent(limit = 50): Promise<Document[]> {
    return this.api.GET<Document[]>(`${this.base}?limit=${limit}`);
  }

  listByObject(objet_type: string, objet_id: number): Promise<Document[]> {
    return this.api.GET<Document[]>(
      `${this.base}?objet_type=${encodeURIComponent(objet_type)}&objet_id=${objet_id}`,
    );
  }

  get(id: number): Promise<Document> {
    return this.api.GET<Document>(`${this.base}/${id}`);
  }

  create(dto: CreateDocumentDto): Promise<Document> {
    return this.api.POST<Document>(this.base, dto);
  }

  update(id: number, dto: UpdateDocumentDto): Promise<Document> {
    return this.api.POST<Document>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }

  /**
   * Le back limite volontairement /photo-by-id à 10 personnes pour éviter
   * d'embarquer des dizaines de Mo de base64 dans une seule réponse.
   *
   * Les anciens appels envoyaient pourtant toute une liste d'adhérents ou
   * tous les riders du menu en une fois. Au-delà de 10 ids le back retournait
   * donc uniquement des photos nulles : d'où l'impression de chargement
   * aléatoire selon la taille de la population.
   *
   * On découpe désormais systématiquement en lots de 10, avec au maximum
   * trois requêtes simultanées. Un lot en échec ne fait pas disparaître les
   * autres et ses ids ne sont pas marqués comme chargés, ce qui autorise un
   * prochain essai par le PersonneDataStore.
   */
  async photo_by_id(ids: number[]): Promise<{ [id: number]: string | null }> {
    const cleanIds = [...new Set((ids ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0))];

    if (!cleanIds.length) return {};

    const batches: number[][] = [];
    for (let i = 0; i < cleanIds.length; i += this.photoBatchSize) {
      batches.push(cleanIds.slice(i, i + this.photoBatchSize));
    }

    const merged: { [id: number]: string | null } = {};

    for (let i = 0; i < batches.length; i += this.photoBatchConcurrency) {
      const window = batches.slice(i, i + this.photoBatchConcurrency);
      const results = await Promise.allSettled(
        window.map((batch) =>
          this.api.POST<{ [id: number]: string | null }>(`${this.base}/photo-by-id`, batch),
        ),
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          Object.assign(merged, result.value ?? {});
          return;
        }
        console.warn('Lot de photos non chargé, un prochain chargement pourra le retenter.', {
          ids: window[index],
          error: result.reason,
        });
      });
    }

    return merged;
  }

  setPhoto(
    objet_id: number,
    photo: string | null,
    objet_type = 'member',
  ): Promise<{ ok: boolean; photo: string | null }> {
    return this.api.POST<{ ok: boolean; photo: string | null }>(`${this.base}/set-photo`, {
      objet_id,
      objet_type,
      photo,
    });
  }
}

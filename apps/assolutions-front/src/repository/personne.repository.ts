import { Injectable } from '@angular/core';
import {
  CreatePersonneDto,
  Personne,
  PersonneLight_VM,
  UpdatePersonneDto,
} from '@shared/lib/personne.interface';
import { PersonneApiService } from '../services/personne-api.service';
import { DocumentApiService } from '../services/document-api.service';

@Injectable({ providedIn: 'root' })
export class PersonneRepository {
  constructor(
    private readonly personneApi: PersonneApiService,
    private readonly documentApi: DocumentApiService,
  ) {}

  listMine(): Promise<Personne[]> {
    return this.personneApi.listMine();
  }

  listByIds(ids: number[]): Promise<Personne[]> {
    const cleanIds = this.cleanIds(ids);
    return cleanIds.length ? this.personneApi.list_by_id(cleanIds) : Promise.resolve([]);
  }

  listLight(ids: number[], includePhotos = false): Promise<PersonneLight_VM[]> {
    const cleanIds = this.cleanIds(ids);
    return cleanIds.length
      ? this.personneApi.list_personnelight(cleanIds, includePhotos)
      : Promise.resolve([]);
  }

  get(id: number): Promise<Personne> {
    return this.personneApi.get(Number(id));
  }

  create(dto: CreatePersonneDto): Promise<Personne> {
    return this.personneApi.create(this.toApiWriteDto(dto) as CreatePersonneDto);
  }

  update(id: number, dto: UpdatePersonneDto): Promise<Personne> {
    return this.personneApi.update(
      Number(id),
      this.toApiWriteDto(dto) as UpdatePersonneDto,
    );
  }

  remove(id: number): Promise<void> {
    return this.personneApi.remove(Number(id));
  }

  loadPhotosByIds(ids: number[]): Promise<Record<number, string | null>> {
    const cleanIds = this.cleanIds(ids);
    return cleanIds.length ? this.documentApi.photo_by_id(cleanIds) : Promise.resolve({});
  }

  async setPhoto(personneId: number, photo: string | null): Promise<string | null> {
    const result = await this.documentApi.setPhoto(Number(personneId), photo ?? null, 'member');
    return result?.photo ?? null;
  }

  /**
   * Les objets de l'éditeur contiennent des enrichissements UI (photo, login,
   * groupes...). Le contrat /personnes est volontairement plus petit et le
   * ValidationPipe du back refuse désormais toute propriété inconnue.
   *
   * On sérialise donc explicitement le DTO à la frontière HTTP : une photo ne
   * peut plus fuiter dans POST/PATCH /personnes et reste gérée par /documents.
   */
  private toApiWriteDto(
    dto: CreatePersonneDto | UpdatePersonneDto,
  ): UpdatePersonneDto {
    const source = (dto ?? {}) as Record<string, unknown>;
    const clean: Record<string, unknown> = {};
    const allowedFields = [
      'compte',
      'date_naissance',
      'last_name',
      'first_name',
      'nickname',
      'gender',
      'address',
      'archive',
    ];

    for (const field of allowedFields) {
      if (source[field] !== undefined) {
        clean[field] = source[field];
      }
    }

    return clean as UpdatePersonneDto;
  }

  private cleanIds(ids: number[]): number[] {
    return [...new Set((ids ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0))];
  }
}

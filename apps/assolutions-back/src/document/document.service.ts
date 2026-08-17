import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateDocumentDto, SetPhotoDto, UpdateDocumentDto } from './document.dto';
import { DocumentEntity } from './document.entity';

@Injectable()
export class DocumentService {
  private static readonly MAX_PHOTOS_PER_REQUEST = 10;

  constructor(
    @InjectRepository(DocumentEntity)
    private readonly repo: Repository<DocumentEntity>,
    
  ) {}

  async listForProject(
    projectId: number,
    options?: {
      objetType?: string;
      objetId?: number;
      limit?: number;
    },
  ) {
    const qb = this.repo
      .createQueryBuilder('document')
      .where('document.project_id = :projectId', { projectId })
      .andWhere('LOWER(document.typedoc) <> :photo', { photo: 'photo' })
      .orderBy('document.date_import', 'DESC')
      .addOrderBy('document.id', 'DESC');

    if (options?.objetType) {
      qb.andWhere('document.objet_type = :objetType', {
        objetType: options.objetType,
      });
    }

    if (options?.objetId) {
      qb.andWhere('document.objet_id = :objetId', {
        objetId: options.objetId,
      });
    }

    qb.take(options?.limit ?? 50);

    return qb.getMany();
  }

  async get(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`document ${id} introuvable`);
    return item;
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.get(id);

    if (item.project_id !== null && item.project_id !== projectId) {
      throw new ForbiddenException('WRONG_PROJECT');
    }

    return item;
  }

  async create(dto: CreateDocumentDto, projectId: number) {
    const saved = await this.repo.save(
      this.repo.create({
        ...dto,
        project_id: projectId,
      }),
    );

    return saved;
  }

  async update(id: number, dto: UpdateDocumentDto, projectId: number) {
    const item = await this.getForProject(id, projectId);

    Object.assign(item, dto, {
      project_id: item.project_id ?? projectId,
    });

    const saved = await this.repo.save(item);

    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);

    await this.repo.remove(item);

    return { ok: true };
  }

  async photoById(ids: number[]): Promise<{ [id: number]: string | null }> {
    const cleanIds = [...new Set((ids ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0))];

    const result: { [id: number]: string | null } = {};
    for (const id of cleanIds) {
      result[id] = null;
    }

    if (!cleanIds.length) return result;

    /*
     * Les photos sont stockées en bytea. Charger des dizaines/centaines de
     * fichiers puis les convertir tous en base64 dans la même requête peut
     * multiplier fortement la mémoire utilisée par Node (Buffer + chaîne
     * base64 + sérialisation JSON). Sur les petites instances Render cela
     * suffit à provoquer un redémarrage OOM.
     *
     * Une liste reste fonctionnelle sans photos grâce aux initiales affichées
     * par le front. Les lectures unitaires (fiche adhérent) continuent, elles,
     * à retourner la photo normalement.
     */
    if (cleanIds.length > DocumentService.MAX_PHOTOS_PER_REQUEST) {
      return result;
    }

    const items = await this.repo
      .createQueryBuilder('document')
      .select([
        'document.objet_id',
        'document.mimetype',
        'document.file_data',
      ])
      .where('document.objet_type = :objetType', { objetType: 'member' })
      .andWhere('document.typedoc = :typedoc', { typedoc: 'photo' })
      .andWhere('document.objet_id IN (:...ids)', { ids: cleanIds })
      .getMany();

    for (const item of items) {
      result[item.objet_id] = item.file_data
        ? `data:${item.mimetype || 'image/jpeg'};base64,${item.file_data.toString('base64')}`
        : null;
    }

    return result;
  }

  async setPhoto(dto: SetPhotoDto, projectId: number) {
    const objet_type = dto.objet_type || 'member';

    const existing = await this.repo.findOne({
      where: {
        objet_id: dto.objet_id,
        objet_type,
        typedoc: 'photo',
      },
    });

    if (!dto.photo) {
      if (existing) {
        await this.repo.remove(existing);
      }

      return { ok: true, photo: null };
    }

    const parsed = this.parseDataUrl(dto.photo);

    const item =
      existing ??
      this.repo.create({
        titre: 'Photo',
        objet_id: dto.objet_id,
        objet_type,
        typedoc: 'photo',
        storage_type: 'DB',
        commentaire: null,
        auteur: null,
        file_path: null,
        project_id: projectId,
      });

    item.titre = 'Photo';
    item.mimetype = parsed.mimetype;
    item.file_data = parsed.buffer;
    item.file_path = null;
    item.storage_type = 'DB';

    const saved = await this.repo.save(item);

    return {
      ok: true,
      photo: `data:${saved.mimetype};base64,${saved.file_data?.toString('base64')}`,
    };
  }

  private parseDataUrl(dataUrl: string): { mimetype: string; buffer: Buffer } {
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);

    if (!match) {
      return {
        mimetype: 'image/jpeg',
        buffer: Buffer.from(dataUrl, 'base64'),
      };
    }

    return {
      mimetype: match[1],
      buffer: Buffer.from(match[2], 'base64'),
    };
  }
}

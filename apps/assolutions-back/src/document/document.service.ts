import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateDocumentDto, SetPhotoDto, UpdateDocumentDto } from './document.dto';
import { DocumentEntity } from './document.entity';

@Injectable()
export class DocumentService {
  private static readonly MAX_PHOTOS_PER_REQUEST = 10;
  private static readonly MAX_PHOTO_BYTES = 5 * 1024 * 1024;
  private static readonly ALLOWED_PHOTO_MIME = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ]);

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

    const requestedLimit = Number(options?.limit ?? 50);
    qb.take(Math.min(Math.max(requestedLimit || 50, 1), 200));

    return qb.getMany();
  }

  async get(id: number, includeFileData = false) {
    const qb = this.repo
      .createQueryBuilder('document')
      .where('document.id = :id', { id });

    if (includeFileData) {
      qb.addSelect('document.file_data');
    }

    const item = await qb.getOne();
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
    return this.repo.save(
      this.repo.create({
        ...dto,
        project_id: projectId,
      }),
    );
  }

  async update(id: number, dto: UpdateDocumentDto, projectId: number) {
    const item = await this.getForProject(id, projectId);

    Object.assign(item, dto, {
      project_id: item.project_id ?? projectId,
    });

    return this.repo.save(item);
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }

  async photoById(
    ids: number[],
    projectId?: number | null,
  ): Promise<{ [id: number]: string | null }> {
    const cleanIds = [
      ...new Set(
        (ids ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];

    const result: { [id: number]: string | null } = {};
    for (const id of cleanIds) result[id] = null;
    if (!cleanIds.length) return result;

    if (cleanIds.length > DocumentService.MAX_PHOTOS_PER_REQUEST) {
      return result;
    }

    const qb = this.repo
      .createQueryBuilder('document')
      .select([
        'document.id',
        'document.objet_id',
        'document.mimetype',
      ])
      .addSelect('document.file_data')
      .where("LOWER(document.objet_type) IN ('member', 'rider', 'personne', 'person')")
      .andWhere('LOWER(document.typedoc) = :typedoc', { typedoc: 'photo' })
      .andWhere('document.objet_id IN (:...ids)', { ids: cleanIds });

    if (projectId) {
      qb.andWhere('(document.project_id = :projectId OR document.project_id IS NULL)', {
        projectId,
      });
    }

    const items = await qb
      .orderBy('document.project_id', 'DESC', 'NULLS LAST')
      .addOrderBy('document.date_import', 'DESC')
      .getMany();

    for (const item of items) {
      if (result[item.objet_id]) continue;
      result[item.objet_id] = item.file_data
        ? `data:${item.mimetype || 'image/jpeg'};base64,${item.file_data.toString('base64')}`
        : null;
    }

    return result;
  }

  async setPhoto(dto: SetPhotoDto, projectId: number) {
    const objetType = String(dto.objet_type || 'member').trim().toLowerCase();

    const existing = await this.repo
      .createQueryBuilder('document')
      .where('document.objet_id = :objetId', { objetId: dto.objet_id })
      .andWhere('LOWER(document.objet_type) = :objetType', { objetType })
      .andWhere('LOWER(document.typedoc) = :typedoc', { typedoc: 'photo' })
      .andWhere('(document.project_id = :projectId OR document.project_id IS NULL)', {
        projectId,
      })
      .orderBy('CASE WHEN document.project_id = :projectId THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy('document.date_import', 'DESC')
      .setParameter('projectId', projectId)
      .getOne();

    if (!dto.photo) {
      if (existing) await this.repo.remove(existing);
      return { ok: true, photo: null };
    }

    const parsed = this.parseDataUrl(dto.photo);

    const item =
      existing ??
      this.repo.create({
        titre: 'Photo',
        objet_id: dto.objet_id,
        objet_type: objetType,
        typedoc: 'photo',
        storage_type: 'DB',
        commentaire: null,
        auteur: null,
        file_path: null,
        project_id: projectId,
      });

    item.titre = 'Photo';
    item.objet_type = objetType;
    item.project_id = projectId;
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
    const mimetype = (match?.[1] ?? 'image/jpeg').toLowerCase();
    const encoded = match?.[2] ?? dataUrl;

    if (!DocumentService.ALLOWED_PHOTO_MIME.has(mimetype)) {
      throw new BadRequestException('PHOTO_TYPE_NOT_ALLOWED');
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(encoded, 'base64');
    } catch {
      throw new BadRequestException('PHOTO_INVALID');
    }

    if (!buffer.length || buffer.length > DocumentService.MAX_PHOTO_BYTES) {
      throw new BadRequestException('PHOTO_TOO_LARGE');
    }

    return { mimetype, buffer };
  }
}

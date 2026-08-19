import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccessControlService } from '../common/access-control.service';
import { CreateDocumentDto, SetPhotoDto, UpdateDocumentDto } from './document.dto';
import { DocumentEntity } from './document.entity';

@Injectable()
export class DocumentService {
  private static readonly MAX_PHOTOS_PER_REQUEST = 10;
  private static readonly MAX_PHOTO_BYTES = 5 * 1024 * 1024;
  private static readonly PERSON_OBJECT_TYPES = new Set(['member', 'rider', 'person', 'personne']);
  private static readonly ALLOWED_PHOTO_MIMES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  constructor(
    @InjectRepository(DocumentEntity)
    private readonly repo: Repository<DocumentEntity>,
    private readonly access: AccessControlService,
  ) {}

  async listForProject(
    projectId: number,
    options?: { objetType?: string; objetId?: number; limit?: number },
  ) {
    const qb = this.repo
      .createQueryBuilder('document')
      .where('document.project_id = :projectId', { projectId })
      .andWhere('LOWER(document.typedoc) <> :photo', { photo: 'photo' })
      .orderBy('document.date_import', 'DESC')
      .addOrderBy('document.id', 'DESC');

    if (options?.objetType) {
      qb.andWhere('document.objet_type = :objetType', { objetType: options.objetType });
    }
    if (options?.objetId) {
      qb.andWhere('document.objet_id = :objetId', { objetId: options.objetId });
    }

    const rawLimit = Number(options?.limit ?? 50);
    const requestedLimit = Number.isFinite(rawLimit) ? rawLimit : 50;
    qb.take(Math.max(1, Math.min(requestedLimit, 200)));
    return qb.getMany();
  }

  async getRaw(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`document ${id} introuvable`);
    return item;
  }

  async getAuthorized(
    id: number,
    requesterId: number,
    requestedProjectId?: number | null,
  ) {
    const item = await this.getRaw(id);

    if (
      requestedProjectId &&
      item.project_id &&
      Number(item.project_id) !== Number(requestedProjectId)
    ) {
      throw new ForbiddenException('WRONG_PROJECT');
    }

    const effectiveProjectId = item.project_id ?? requestedProjectId ?? null;
    const objectType = String(item.objet_type ?? '').toLowerCase();

    if (DocumentService.PERSON_OBJECT_TYPES.has(objectType)) {
      await this.access.getAuthorizedPerson(requesterId, item.objet_id, effectiveProjectId);
      return item;
    }

    if (!effectiveProjectId) throw new ForbiddenException('DOCUMENT_PROJECT_REQUIRED');
    await this.access.assertProjectAdmin(requesterId, effectiveProjectId);
    return item;
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.getRaw(id);
    if (Number(item.project_id) !== Number(projectId)) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
    return item;
  }

  async create(dto: CreateDocumentDto, projectId: number, requesterId: number) {
    await this.assertDocumentObjectAccess(dto.objet_type, dto.objet_id, requesterId, projectId);
    return this.repo.save(this.repo.create({ ...dto, project_id: projectId }));
  }

  async update(
    id: number,
    dto: UpdateDocumentDto,
    projectId: number,
    requesterId: number,
  ) {
    const item = await this.getForProject(id, projectId);
    const nextObjectType = dto.objet_type ?? item.objet_type;
    const nextObjectId = dto.objet_id ?? item.objet_id;
    await this.assertDocumentObjectAccess(nextObjectType, nextObjectId, requesterId, projectId);

    Object.assign(item, dto, { project_id: projectId });
    return this.repo.save(item);
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }

  async photoById(
    ids: number[],
    requesterId: number,
    projectId?: number | null,
  ): Promise<{ [id: number]: string | null }> {
    const authorized = await this.access.assertPersonIdsAccess(requesterId, ids, projectId);
    const cleanIds = [...new Set(authorized.map((person) => Number(person.id)))];

    const result: { [id: number]: string | null } = {};
    for (const id of cleanIds) result[id] = null;
    if (!cleanIds.length) return result;
    if (cleanIds.length > DocumentService.MAX_PHOTOS_PER_REQUEST) return result;

    const qb = this.repo
      .createQueryBuilder('document')
      .select(['document.objet_id', 'document.mimetype', 'document.file_data'])
      .where('document.objet_type = :objetType', { objetType: 'member' })
      .andWhere('document.typedoc = :typedoc', { typedoc: 'photo' })
      .andWhere('document.objet_id IN (:...ids)', { ids: cleanIds });

    if (projectId) qb.andWhere('document.project_id = :projectId', { projectId });
    const items = await qb.getMany();

    for (const item of items) {
      result[item.objet_id] = item.file_data
        ? `data:${item.mimetype || 'image/jpeg'};base64,${item.file_data.toString('base64')}`
        : null;
    }
    return result;
  }

  async setPhoto(dto: SetPhotoDto, projectId: number, requesterId: number) {
    const objetType = dto.objet_type || 'member';
    await this.assertDocumentObjectAccess(objetType, dto.objet_id, requesterId, projectId);

    const existing = await this.repo.findOne({
      where: {
        objet_id: dto.objet_id,
        objet_type: objetType,
        typedoc: 'photo',
        project_id: projectId,
      },
    });

    if (!dto.photo) {
      if (existing) await this.repo.remove(existing);
      return { ok: true, photo: null };
    }

    const parsed = this.parseDataUrl(dto.photo);
    if (!DocumentService.ALLOWED_PHOTO_MIMES.has(parsed.mimetype.toLowerCase())) {
      throw new BadRequestException('PHOTO_TYPE_NOT_ALLOWED');
    }
    if (parsed.buffer.length > DocumentService.MAX_PHOTO_BYTES) {
      throw new PayloadTooLargeException('PHOTO_TOO_LARGE');
    }

    const item = existing ?? this.repo.create({
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
    item.mimetype = parsed.mimetype;
    item.file_data = parsed.buffer;
    item.file_path = null;
    item.storage_type = 'DB';
    item.project_id = projectId;

    const saved = await this.repo.save(item);
    return {
      ok: true,
      photo: `data:${saved.mimetype};base64,${saved.file_data?.toString('base64')}`,
    };
  }

  private async assertDocumentObjectAccess(
    objectType: string,
    objectId: number,
    requesterId: number,
    projectId: number,
  ): Promise<void> {
    const normalizedType = String(objectType ?? '').toLowerCase();
    if (!DocumentService.PERSON_OBJECT_TYPES.has(normalizedType)) return;
    await this.access.getAuthorizedPerson(requesterId, Number(objectId), projectId);
  }

  private parseDataUrl(dataUrl: string): { mimetype: string; buffer: Buffer } {
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      return { mimetype: 'image/jpeg', buffer: Buffer.from(dataUrl, 'base64') };
    }
    return { mimetype: match[1], buffer: Buffer.from(match[2], 'base64') };
  }
}

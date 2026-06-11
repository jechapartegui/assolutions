import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { CreateDocumentDto, SetPhotoDto, UpdateDocumentDto } from './document.dto';
import { DocumentEntity } from './document.entity';

@Injectable()
export class DocumentService {
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
    const items = await this.repo.findBy({
      objet_type: 'member',
      objet_id: In(ids),
      typedoc: 'photo',
    });

    const result: { [id: number]: string | null } = {};
    for (const id of ids) {
      result[id] = null;
    }

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
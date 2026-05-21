import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { CreateDocumentDto, SetPhotoDto, UpdateDocumentDto } from './document.dto';
import { DocumentEntity } from './document.entity';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity) private readonly repo: Repository<DocumentEntity>,
    private readonly registry: RegistryService,
  ) {}

  async get(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`document ${id} introuvable`);
    return item;
  }

  async create(dto: CreateDocumentDto) {
    const saved = await this.repo.save(this.repo.create(dto as CreateDocumentDto));
    await this.registry.ensure('document', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateDocumentDto) {
    const item = await this.get(id);
    Object.assign(item, dto);
    const saved = await this.repo.save(item);
    await this.registry.ensure('document', id);
    return saved;
  }

  async remove(id: number) {
    const item = await this.get(id);
    await this.repo.remove(item);
    await this.registry.remove('document', id);
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
      ? `data:image/jpeg;base64,${item.file_data.toString('base64')}`
      : null;
  }

  return result;
}
async setPhoto(dto: SetPhotoDto) {
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
      await this.registry.remove('document', existing.id);
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
    });

  item.titre = 'Photo';
  item.mimetype = parsed.mimetype;
  item.file_data = parsed.buffer;
  item.file_path = null;
  item.storage_type = 'DB';

  const saved = await this.repo.save(item);
  await this.registry.ensure('document', saved.id);

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

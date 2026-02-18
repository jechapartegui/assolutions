import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { CreateDocumentDto, UpdateDocumentDto } from './document.dto';
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
}

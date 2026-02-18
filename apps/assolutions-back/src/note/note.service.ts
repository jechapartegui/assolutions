import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { CreateNoteDto, UpdateNoteDto } from './note.dto';
import { NoteEntity } from './note.entity';

@Injectable()
export class NoteService {
  constructor(
    @InjectRepository(NoteEntity) private readonly repo: Repository<NoteEntity>,
    private readonly registry: RegistryService,
  ) {}

  listForAccount(accountId: number) {
    return this.repo.find({ where: { account_id: accountId }, order: { id: 'DESC' } });
  }

  async getForAccount(id: number, accountId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`note ${id} introuvable`);
    if (item.account_id !== accountId) throw new ForbiddenException('NOT_YOURS');
    return item;
  }

  async create(dto: CreateNoteDto, accountId: number) {
    const saved = await this.repo.save(this.repo.create({ ...dto as CreateNoteDto, account_id: accountId }));
    await this.registry.ensure('note', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateNoteDto, accountId: number) {
    const item = await this.getForAccount(id, accountId);
    Object.assign(item, dto, { date_maj: new Date() });
    const saved = await this.repo.save(item);
    await this.registry.ensure('note', id);
    return saved;
  }

  async remove(id: number, accountId: number) {
    const item = await this.getForAccount(id, accountId);
    await this.repo.remove(item);
    await this.registry.remove('note', id);
    return { ok: true };
  }
}

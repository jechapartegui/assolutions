import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { CreateMailAccountDto, UpdateMailAccountDto } from './mail_account.dto';
import { MailAccountEntity } from './mail_account.entity';

@Injectable()
export class MailAccountService {
  constructor(
    @InjectRepository(MailAccountEntity) private readonly repo: Repository<MailAccountEntity>,
    private readonly registry: RegistryService,
  ) {}

  list() {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async get(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`mail_account ${id} introuvable`);
    return item;
  }

  async create(dto: CreateMailAccountDto) {
    const saved = await this.repo.save(this.repo.create(dto as CreateMailAccountDto));
    await this.registry.ensure('mail_account', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateMailAccountDto) {
    const item = await this.get(id);
    Object.assign(item, dto);
    const saved = await this.repo.save(item);
    await this.registry.ensure('mail_account', id);
    return saved;
  }

  async remove(id: number) {
    const item = await this.get(id);
    await this.repo.remove(item);
    await this.registry.remove('mail_account', id);
    return { ok: true };
  }
}

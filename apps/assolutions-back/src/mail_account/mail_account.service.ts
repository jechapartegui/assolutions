import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateMailAccountDto, UpdateMailAccountDto } from './mail_account.dto';
import { MailAccountEntity } from './mail_account.entity';

@Injectable()
export class MailAccountService {
  constructor(
    @InjectRepository(MailAccountEntity)
    private readonly repo: Repository<MailAccountEntity>,
  ) {}

  async list() {
    const items = await this.repo.find({ order: { id: 'ASC' } });
    return items.map((item) => this.sanitize(item));
  }

  async get(id: number) {
    return this.sanitize(await this.getEntity(id));
  }

  async create(dto: CreateMailAccountDto) {
    const saved = await this.repo.save(
      this.repo.create(dto as CreateMailAccountDto),
    );
    return this.sanitize(saved);
  }

  async update(id: number, dto: UpdateMailAccountDto) {
    const item = await this.getEntity(id);
    Object.assign(item, dto);
    const saved = await this.repo.save(item);
    return this.sanitize(saved);
  }

  async remove(id: number) {
    const item = await this.getEntity(id);
    await this.repo.remove(item);
    return { ok: true };
  }

  private async getEntity(id: number): Promise<MailAccountEntity> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`mail_account ${id} introuvable`);
    return item;
  }

  private sanitize(item: MailAccountEntity) {
    const { password_enc: _password, ...safe } = item;
    return safe;
  }
}

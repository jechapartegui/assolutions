import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateMailAccountDto, UpdateMailAccountDto } from './mail_account.dto';
import { MailAccountEntity } from './mail_account.entity';

type SafeMailAccount = Omit<MailAccountEntity, 'password_enc'> & {
  password_configured: boolean;
};

@Injectable()
export class MailAccountService {
  constructor(
    @InjectRepository(MailAccountEntity)
    private readonly repo: Repository<MailAccountEntity>,
  ) {}

  async list(): Promise<SafeMailAccount[]> {
    const items = await this.repo.find({ order: { id: 'ASC' } });
    return items.map((item) => this.toSafeView(item));
  }

  async get(id: number): Promise<SafeMailAccount> {
    return this.toSafeView(await this.getRaw(id));
  }

  async create(dto: CreateMailAccountDto): Promise<SafeMailAccount> {
    const saved = await this.repo.save(this.repo.create(dto));
    return this.toSafeView(saved);
  }

  async update(id: number, dto: UpdateMailAccountDto): Promise<SafeMailAccount> {
    const item = await this.getRaw(id);
    Object.assign(item, dto);
    return this.toSafeView(await this.repo.save(item));
  }

  async remove(id: number) {
    const item = await this.getRaw(id);
    await this.repo.remove(item);
    return { ok: true };
  }

  private async getRaw(id: number): Promise<MailAccountEntity> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`mail_account ${id} introuvable`);
    return item;
  }

  private toSafeView(item: MailAccountEntity): SafeMailAccount {
    const { password_enc, ...safe } = item;
    return {
      ...safe,
      password_configured: Boolean(password_enc),
    };
  }
}

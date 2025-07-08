
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Account } from '../entities/compte.entity';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private readonly repo: Repository<Account>,
  ) {}

  async get(id: number): Promise<Account> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('ACCOUNT_NOT_FOUND');
    return item;
  }

  async getAll(): Promise<Account[]> {
    return this.repo.find();
  }

  async create(data: Partial<Account>): Promise<Account> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<Account>): Promise<Account> {
    await this.get(id);
    try {
      await this.repo.update({ id }, data);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
    return this.get(id);
  }

  async delete(id: number): Promise<void> {
    await this.get(id);
    await this.repo.delete({ id });
  }
}

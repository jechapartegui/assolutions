import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { BankAccount } from '../entities/compte_bancaire.entity';


@Injectable()
export class BankAccountService {
constructor(@InjectRepository(BankAccount) private repo: Repository<BankAccount>) {}


async get(id: number) { const e = await this.repo.findOne({ where: { id } }); if (!e) throw new NotFoundException('BANK_ACCOUNT_NOT_FOUND'); return e; }
async getAll(projectId: number) { return this.repo.find({ where: { projectId } }); }
async create(data: Partial<BankAccount>) { try { const e = this.repo.create(data); return await this.repo.save(e); } catch (err) { if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR'); throw err; } }
async update(id: number, data: Partial<BankAccount>) { try { await this.repo.update({ id }, data); } catch (err) { if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR'); throw err; } return this.get(id); }
async delete(id: number) { await this.repo.delete(id); }
}
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Operation } from '../entities/operation.entity';


@Injectable()
export class OperationService {
constructor(@InjectRepository(Operation) private repo: Repository<Operation>) {}


async get(id: number) { const e = await this.repo.findOne({ where: { id } }); if (!e) throw new NotFoundException('OPERATION_NOT_FOUND'); return e; }
async getAllByAccount(bankAccountId: number) { return this.repo.find({ where: { bankAccountId } }); }
async getAllByFlow(financialFlowId: number) { return this.repo.find({ where: { financialFlowId } }); }
async create(data: Partial<Operation>) { try { const e = this.repo.create(data); return await this.repo.save(e); } catch (err) { if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR'); throw err; } }
async update(id: number, data: Partial<Operation>) { try { await this.repo.update({ id }, data); } catch (err) { if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR'); throw err; } return this.get(id); }
async delete(id: number) { await this.repo.delete(id); }
}
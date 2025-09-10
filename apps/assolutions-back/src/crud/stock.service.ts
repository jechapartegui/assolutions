import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { StockItem } from '../entities/stock.entity';



@Injectable()
export class StockService {
constructor(@InjectRepository(StockItem) private repo: Repository<StockItem>) {}


async get(id: number) { const e = await this.repo.findOne({ where: { id } }); if (!e) throw new NotFoundException('STOCK_NOT_FOUND'); return e; }
async getAll(projectId: number) { return this.repo.find({ where: { projectId } }); }
async create(data: Partial<StockItem>) { try { const e = this.repo.create(data); return await this.repo.save(e); } catch (err) { if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR'); throw err; } }
async update(id: number, data: Partial<StockItem>) { try { await this.repo.update({ id }, data); } catch (err) { if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR'); throw err; } return this.get(id); }
async delete(id: number) { await this.repo.delete(id); }
}
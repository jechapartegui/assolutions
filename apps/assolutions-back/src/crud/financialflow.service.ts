import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { FinancialFlow } from '../entities/flux_financier.entity';

@Injectable()
export class FinancialFlowService {
  constructor(
    @InjectRepository(FinancialFlow) private repo: Repository<FinancialFlow>
  ) {}

  async get(id: number) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('FLOW_NOT_FOUND');
    return e;
  }
  async getAll(projectId: number) {
    return this.repo.find({ where: { projectId } });
  }
  async getAllSeason(seasonId: number) {
    return this.repo.find({ where: { seasonId } });
  }
  async create(data: Partial<FinancialFlow>) {
    try {
      const e = this.repo.create(data);
      return await this.repo.save(e);
    } catch (err) {
      if (err instanceof QueryFailedError)
        throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }
  async update(id: number, data: Partial<FinancialFlow>) {
    try {
      await this.repo.update({ id }, data);
    } catch (err) {
      if (err instanceof QueryFailedError)
        throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
    return this.get(id);
  }
  async delete(id: number) {
    await this.repo.delete(id);
  }
}

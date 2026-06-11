import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateStockDto, UpdateStockDto } from './stock.dto';
import { StockEntity } from './stock.entity';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(StockEntity)
    private readonly repo: Repository<StockEntity>,
    
  ) {}

  listForProject(projectId: number, fluxFinancierId?: number) {
    return this.repo.find({
      where: {
        project_id: projectId,
        ...(fluxFinancierId ? { flux_financier_id: fluxFinancierId } : {}),
      },
      order: { id: 'ASC' },
    });
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException(`stock ${id} introuvable`);
    }

    if (item.project_id !== projectId) {
      throw new ForbiddenException('WRONG_PROJECT');
    }

    return item;
  }

  async create(dto: CreateStockDto, projectId: number) {
    const saved = await this.repo.save(
      this.repo.create({
        ...dto,
        project_id: projectId,
        qte: dto.qte ?? 1,
        lieu_id: dto.lieu_id ?? null,
        type_stock_id: dto.type_stock_id ?? null,
        valeur_achat: dto.valeur_achat ?? null,
        date_achat: dto.date_achat ?? null,
        flux_financier_id: dto.flux_financier_id ?? null,
      }),
    );


    return saved;
  }

  async update(id: number, dto: UpdateStockDto, projectId: number) {
    const item = await this.getForProject(id, projectId);

    Object.assign(item, {
      ...dto,
      project_id: projectId,
    });

    const saved = await this.repo.save(item);

    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);

    await this.repo.remove(item);
    return { ok: true };
  }
}
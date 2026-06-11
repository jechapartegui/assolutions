import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateFluxFinancierDto, UpdateFluxFinancierDto } from './flux_financier.dto';
import { FluxFinancierEntity } from './flux_financier.entity';

@Injectable()
export class FluxFinancierService {
  constructor(
    @InjectRepository(FluxFinancierEntity)
    private readonly repo: Repository<FluxFinancierEntity>,
    
  ) {}

  listForProject(projectId: number, saisonId?: number, includeSysteme = false) {
    return this.repo.find({
      where: {
        project_id: projectId,
        ...(saisonId ? { saison_id: saisonId } : {}),
        ...(includeSysteme ? {} : { flux_systeme: false }),
      },
      order: { date: 'DESC', id: 'DESC' },
    });
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException(`flux_financier ${id} introuvable`);
    }

    if (item.project_id !== projectId) {
      throw new ForbiddenException('WRONG_PROJECT');
    }

    return item;
  }

  async create(dto: CreateFluxFinancierDto, projectId: number) {
    const saved = await this.repo.save(
      this.repo.create({
        ...dto,
        project_id: projectId,
        classe_comptable_id: dto.classe_comptable_id ?? null,
        nb_paiement: dto.nb_paiement ?? 1,
        type_frais: dto.type_frais ?? null,
        personne_id: dto.personne_id ?? null,
        contrat_prof_id: dto.contrat_prof_id ?? null,
        flux_systeme: dto.flux_systeme ?? false,
        origine: dto.origine ?? null,
      }),
    );

    return saved;
  }

  async update(id: number, dto: UpdateFluxFinancierDto, projectId: number) {
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

    if (item.flux_systeme) {
      throw new ForbiddenException('SYSTEM_FLUX_CANNOT_BE_DELETED');
    }

    await this.repo.remove(item);
    return { ok: true };
  }
}
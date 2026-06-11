import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompteBancaireEntity } from '../compte_bancaire/compte_bancaire.entity';
import { FluxFinancierEntity } from '../flux_financier/flux_financier.entity';

import { CreateOperationDto, UpdateOperationDto } from './operation.dto';
import { OperationEntity } from './operation.entity';

@Injectable()
export class OperationService {
  constructor(
    @InjectRepository(OperationEntity)
    private readonly repo: Repository<OperationEntity>,

    @InjectRepository(FluxFinancierEntity)
    private readonly fluxRepo: Repository<FluxFinancierEntity>,

    @InjectRepository(CompteBancaireEntity)
    private readonly compteRepo: Repository<CompteBancaireEntity>,

    
  ) {}

  private async assertFluxInProject(fluxId: number, projectId: number) {
    const flux = await this.fluxRepo.findOne({ where: { id: fluxId } });

    if (!flux) {
      throw new NotFoundException(`flux_financier ${fluxId} introuvable`);
    }

    if (flux.project_id !== projectId) {
      throw new ForbiddenException('WRONG_PROJECT');
    }

    return flux;
  }

  private async assertCompteInProject(compteId: number, projectId: number) {
    const compte = await this.compteRepo.findOne({ where: { id: compteId } });

    if (!compte) {
      throw new NotFoundException(`compte_bancaire ${compteId} introuvable`);
    }

    if (compte.project_id !== projectId) {
      throw new ForbiddenException('WRONG_PROJECT');
    }

    return compte;
  }

  listForProject(projectId: number) {
    return this.repo
      .createQueryBuilder('o')
      .innerJoin('compte_bancaire', 'cb', 'cb.id = o.compte_bancaire_id')
      .leftJoin('flux_financier', 'f', 'f.id = o.flux_financier_id')
      .where('cb.project_id = :projectId', { projectId })
      .andWhere('(f.id IS NULL OR f.project_id = :projectId)', { projectId })
      .orderBy('o.date_operation', 'DESC')
      .addOrderBy('o.id', 'DESC')
      .getMany();
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException(`operation ${id} introuvable`);
    }

    await this.assertCompteInProject(item.compte_bancaire_id, projectId);

    if (item.flux_financier_id) {
      await this.assertFluxInProject(item.flux_financier_id, projectId);
    }

    return item;
  }

  async create(dto: CreateOperationDto, projectId: number) {
    await this.assertCompteInProject(dto.compte_bancaire_id, projectId);

    if (dto.flux_financier_id) {
      await this.assertFluxInProject(dto.flux_financier_id, projectId);
    }

    if (dto.import_key) {
      const existing = await this.repo.findOne({
        where: { import_key: dto.import_key },
      });

      if (existing) {
        return existing;
      }
    }

    const saved = await this.repo.save(
      this.repo.create({
        solde: dto.solde,
        date_operation: dto.date_operation,
        date_previsionnelle: dto.date_previsionnelle ?? dto.date_operation,
        mode: dto.mode,
        destinataire: dto.destinataire,
        paiement_execute: dto.paiement_execute,
        compte_bancaire_id: dto.compte_bancaire_id,
        flux_financier_id: dto.flux_financier_id ?? null,
        libelle_bancaire: dto.libelle_bancaire ?? null,
        import_key: dto.import_key ?? null,
        source_import: dto.source_import ?? null,
        info: dto.info ?? null,
      }),
    );

    return saved;
  }

  async update(id: number, dto: UpdateOperationDto, projectId: number) {
    const item = await this.getForProject(id, projectId);

    if (dto.compte_bancaire_id) {
      await this.assertCompteInProject(dto.compte_bancaire_id, projectId);
    }

    if (dto.flux_financier_id !== undefined && dto.flux_financier_id !== null) {
      await this.assertFluxInProject(dto.flux_financier_id, projectId);
    }

    Object.assign(item, {
      ...dto,
      flux_financier_id:
        dto.flux_financier_id === undefined
          ? item.flux_financier_id
          : dto.flux_financier_id,
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
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';


import { FluxFinancierEntity } from '../flux_financier/flux_financier.entity';
import { OperationEntity } from '../operation/operation.entity';
import { CompteBancaireEntity } from '../compte_bancaire/compte_bancaire.entity';

import { BudgetScenarioEntity } from './budget_scenario.entity';
import { BudgetLigneEntity } from './budget_ligne.entity';
import { ClasseComptableEntity } from './classe_comptable.entity';

import {
  CreateBudgetLigneDto,
  CreateBudgetScenarioDto,
  CreateClasseComptableDto,
  CreateOperationDto,
  UpdateBudgetLigneDto,
  UpdateBudgetScenarioDto,
  UpdateClasseComptableDto,
  UpdateOperationDto,
} from './finance.dto';
import { CreateFluxFinancierDto } from '../flux_financier/flux_financier.dto';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(FluxFinancierEntity)
    private readonly fluxRepo: Repository<FluxFinancierEntity>,

    @InjectRepository(OperationEntity)
    private readonly operationRepo: Repository<OperationEntity>,

    @InjectRepository(CompteBancaireEntity)
    private readonly compteRepo: Repository<CompteBancaireEntity>,

    @InjectRepository(BudgetScenarioEntity)
    private readonly scenarioRepo: Repository<BudgetScenarioEntity>,

    @InjectRepository(BudgetLigneEntity)
    private readonly ligneRepo: Repository<BudgetLigneEntity>,

    @InjectRepository(ClasseComptableEntity)
    private readonly classeRepo: Repository<ClasseComptableEntity>,

    
  ) {}

  listClasses(projectId: number, pays?: string, lang = 'fr') {
    return this.classeRepo
      .createQueryBuilder('classe')
      .where('classe.actif = true')
      .andWhere('(classe.project_id IS NULL OR classe.project_id = :projectId)', { projectId })
      .andWhere('(classe.pays IS NULL OR classe.pays = :pays)', { pays: pays ?? 'FR' })
      .andWhere('classe.lang = :lang', { lang })
      .orderBy('classe.ordre', 'ASC')
      .addOrderBy('classe.code', 'ASC')
      .getMany();
  }

  createClasse(projectId: number, dto: CreateClasseComptableDto) {
    return this.classeRepo.save(
      this.classeRepo.create({
        ...dto,
        project_id: dto.project_id === undefined ? null : dto.project_id,
        pays: dto.pays ?? 'FR',
        lang: dto.lang ?? 'fr',
        actif: dto.actif ?? true,
        ordre: dto.ordre ?? 0,
      }),
    );
  }

  async getClasseForProject(projectId: number, id: number) {
    const item = await this.classeRepo.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException(`classe_comptable ${id} introuvable`);
    }

    if (item.project_id !== null && item.project_id !== projectId) {
      throw new ForbiddenException('WRONG_PROJECT');
    }

    return item;
  }

  async updateClasse(projectId: number, id: number, dto: UpdateClasseComptableDto) {
    const item = await this.getClasseForProject(projectId, id);
    Object.assign(item, dto);
    return this.classeRepo.save(item);
  }

  async deleteClasse(projectId: number, id: number) {
    const item = await this.getClasseForProject(projectId, id);

    if (item.project_id === null) {
      throw new ForbiddenException('GLOBAL_CLASSE_CANNOT_BE_DELETED_FROM_PROJECT');
    }

    await this.classeRepo.remove(item);
    return { ok: true };
  }

  listScenarios(projectId: number, saisonId?: number) {
    return this.scenarioRepo.find({
      where: {
        project_id: projectId,
        ...(saisonId ? { saison_id: saisonId } : {}),
      },
      order: { scenario_defaut: 'DESC', id: 'ASC' },
    });
  }

  createScenario(projectId: number, dto: CreateBudgetScenarioDto) {
    return this.scenarioRepo.save(
      this.scenarioRepo.create({
        ...dto,
        project_id: projectId,
        scenario_defaut: dto.scenario_defaut ?? false,
      }),
    );
  }

  async getScenarioForProject(projectId: number, id: number) {
    const item = await this.scenarioRepo.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException(`budget_scenario ${id} introuvable`);
    }

    if (item.project_id !== projectId) {
      throw new ForbiddenException('WRONG_PROJECT');
    }

    return item;
  }

  async updateScenario(projectId: number, id: number, dto: UpdateBudgetScenarioDto) {
    const item = await this.getScenarioForProject(projectId, id);
    Object.assign(item, dto, { project_id: projectId });
    return this.scenarioRepo.save(item);
  }

  async deleteScenario(projectId: number, id: number) {
    const item = await this.getScenarioForProject(projectId, id);
    await this.scenarioRepo.remove(item);
    return { ok: true };
  }

  async listLignes(projectId: number, scenarioId?: number) {
    if (scenarioId) {
      await this.getScenarioForProject(projectId, scenarioId);
    }

    if (!scenarioId) {
      return this.ligneRepo
        .createQueryBuilder('ligne')
        .innerJoin(BudgetScenarioEntity, 'scenario', 'scenario.id = ligne.budget_scenario_id')
        .where('scenario.project_id = :projectId', { projectId })
        .orderBy('ligne.id', 'ASC')
        .getMany();
    }

    return this.ligneRepo.find({
      where: { budget_scenario_id: scenarioId },
      order: { id: 'ASC' },
    });
  }

  async createLigne(projectId: number, dto: CreateBudgetLigneDto) {
    await this.getScenarioForProject(projectId, dto.budget_scenario_id);
    await this.getClasseForProject(projectId, dto.classe_comptable_id);

    return this.ligneRepo.save(this.ligneRepo.create(dto));
  }

  async getLigneForProject(projectId: number, id: number) {
    const item = await this.ligneRepo.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException(`budget_ligne ${id} introuvable`);
    }

    await this.getScenarioForProject(projectId, item.budget_scenario_id);
    return item;
  }

  async updateLigne(projectId: number, id: number, dto: UpdateBudgetLigneDto) {
    const item = await this.getLigneForProject(projectId, id);

    if (dto.classe_comptable_id) {
      await this.getClasseForProject(projectId, dto.classe_comptable_id);
    }

    Object.assign(item, dto);
    return this.ligneRepo.save(item);
  }

  async deleteLigne(projectId: number, id: number) {
    const item = await this.getLigneForProject(projectId, id);
    await this.ligneRepo.remove(item);
    return { ok: true };
  }

  async listOperations(projectId: number, fluxId?: number) {
    if (fluxId) {
      await this.getFluxForProject(projectId, fluxId);

      return this.operationRepo.find({
        where: { flux_financier_id: fluxId },
        order: { date_operation: 'ASC', id: 'ASC' },
      });
    }

    return this.operationRepo
      .createQueryBuilder('operation')
      .innerJoin(FluxFinancierEntity, 'flux', 'flux.id = operation.flux_financier_id')
      .where('flux.project_id = :projectId', { projectId })
      .orderBy('operation.date_operation', 'DESC')
      .addOrderBy('operation.id', 'DESC')
      .getMany();
  }

  async createOperation(projectId: number, dto: CreateOperationDto) {
    await this.getCompteForProject(projectId, dto.compte_bancaire_id);

    if (dto.import_key) {
      const existing = await this.operationRepo.findOne({
        where: { import_key: dto.import_key },
      });

      if (existing) {
        return existing;
      }
    }

    const fluxId =
      dto.flux_financier_id ??
      (await this.resolveDefaultFluxIdForOperation(projectId, dto));

    const saved = await this.operationRepo.save(
      this.operationRepo.create({
        solde: dto.solde,
        date_operation: dto.date_operation,
        date_previsionnelle: dto.date_previsionnelle ?? dto.date_operation,
        mode: dto.mode,
        destinataire: dto.destinataire,
        paiement_execute: dto.paiement_execute,
        compte_bancaire_id: dto.compte_bancaire_id,
        flux_financier_id: fluxId,
        libelle_bancaire: dto.libelle_bancaire ?? null,
        source_import: dto.source_import ?? null,
        import_key: dto.import_key ?? null,
        info: dto.info ?? null,
      }),
    );

    return saved;
  }

  async updateOperation(projectId: number, id: number, dto: UpdateOperationDto) {
    const item = await this.getOperationForProject(projectId, id);

    if (dto.compte_bancaire_id) {
      await this.getCompteForProject(projectId, dto.compte_bancaire_id);
    }

    if (dto.flux_financier_id !== undefined && dto.flux_financier_id !== null) {
      await this.getFluxForProject(projectId, dto.flux_financier_id);
    }

    Object.assign(item, {
      ...dto,
      flux_financier_id:
        dto.flux_financier_id === undefined
          ? item.flux_financier_id
          : dto.flux_financier_id,
    });

    const saved = await this.operationRepo.save(item);

    return saved;
  }

  async getOperationForProject(projectId: number, id: number) {
    const item = await this.operationRepo.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException(`operation ${id} introuvable`);
    }

    await this.getCompteForProject(projectId, item.compte_bancaire_id);

    if (item.flux_financier_id) {
      await this.getFluxForProject(projectId, item.flux_financier_id);
    }

    return item;
  }

  async deleteOperation(projectId: number, id: number) {
    const item = await this.getOperationForProject(projectId, id);
    await this.operationRepo.remove(item);
    return { ok: true };
  }

  async createFluxFromOperation(projectId: number, operationId: number, saisonId: number) {
    const op = await this.getOperationForProject(projectId, operationId);

    const libelle = op.libelle_bancaire || op.destinataire || `Opération ${op.id}`;

    const flux = await this.fluxRepo.save(
      this.fluxRepo.create({
        libelle,
        date: op.date_operation,
        destinataire: op.destinataire || libelle,
        recette: Number(op.solde) > 0,
        statut: 0,
        montant: Math.abs(Number(op.solde ?? 0)),
        info: op.info ?? null,
        project_id: projectId,
        saison_id: saisonId,
        classe_comptable: null,
        classe_comptable_id: null,
        nb_paiement: 1,
        type_frais: null,
        personne_id: null,
        contrat_prof_id: null,
        objet_type: null,
        objet_id: null,
        flux_systeme: false,
        origine: 'CREATED_FROM_OPERATION',
      } as CreateFluxFinancierDto),
    );


    op.flux_financier_id = flux.id;
    await this.operationRepo.save(op);

    return { flux, operation: op };
  }

  async getFluxForProject(projectId: number, id: number) {
    const item = await this.fluxRepo.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException(`flux_financier ${id} introuvable`);
    }

    if (item.project_id !== projectId) {
      throw new ForbiddenException('WRONG_PROJECT');
    }

    return item;
  }

  async getCompteForProject(projectId: number, id: number) {
    const item = await this.compteRepo.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException(`compte_bancaire ${id} introuvable`);
    }

    if (item.project_id !== projectId) {
      throw new ForbiddenException('WRONG_PROJECT');
    }

    return item;
  }

private async resolveDefaultFluxIdForOperation(
  projectId: number,
  dto: CreateOperationDto | UpdateOperationDto,
): Promise<number> {
  if (!dto.saison_id) {
    throw new NotFoundException('saison_id requis pour créer un flux système à classer');
  }

  const recette = Number(dto.solde ?? 0) > 0;
  const classeCode = recette ? '7' : '6';
  const origine = recette ? 'IMPORT_A_CLASSER_RECETTE' : 'IMPORT_A_CLASSER_DEPENSE';
  const libelle = recette ? 'À classer - Recettes' : 'À classer - Dépenses';

  const classe = await this.classeRepo.findOne({
    where: {
      code: classeCode,
      lang: 'fr',
    } as any,
  });

  const existing = await this.fluxRepo.findOne({
    where: {
      project_id: projectId,
      saison_id: dto.saison_id,
      origine,
      flux_systeme: true,
    },
  });

  if (existing) {
    return existing.id;
  }

  const created = await this.fluxRepo.save(
    this.fluxRepo.create({
      libelle,
      date: dto.date_operation ?? new Date().toISOString().slice(0, 10),
      destinataire: 'Import bancaire',
      recette,
      statut: 0,
      montant: 0,
      info: 'Flux système utilisé pour les opérations bancaires importées non classées.',
      project_id: projectId,
      saison_id: dto.saison_id,
      classe_comptable_id: classe?.id ?? null,
      nb_paiement: 1,
      type_frais: null,
      personne_id: null,
      contrat_prof_id: null,
      flux_systeme: true,
      origine,
    }),
  );

  return created.id;
}

  budgetRealise(projectId: number, saisonId: number) {
    return this.fluxRepo
      .createQueryBuilder('flux')
      .leftJoin(
        (qb) =>
          qb
            .select('op.flux_financier_id', 'flux_financier_id')
            .addSelect('SUM(ABS(op.solde))', 'montant_paye')
            .from('operation', 'op')
            .where('op.paiement_execute = true')
            .groupBy('op.flux_financier_id'),
        'op_sum',
        'op_sum.flux_financier_id = flux.id',
      )
      .select('flux.classe_comptable_id', 'classe_comptable_id')
      .addSelect('SUM(ABS(flux.montant))', 'montant_flux')
      .addSelect('COALESCE(SUM(op_sum.montant_paye), 0)', 'montant_paye')
      .where('flux.project_id = :projectId', { projectId })
      .andWhere('flux.saison_id = :saisonId', { saisonId })
      .andWhere('flux.flux_systeme = false')
      .groupBy('flux.classe_comptable_id')
      .orderBy('flux.classe_comptable_id', 'ASC')
      .getRawMany();
  }
}
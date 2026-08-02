import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';

import { GroupesEntity } from '../groupes/groupes.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { TarifInscriptionEntity } from '../tarif_inscription/tarif_inscription.entity';
import { SaveExigenceDossierDto, UpdateExigenceDossierDto } from './exigence-dossier.dto';
import { ExigenceDossierEntity } from './exigence-dossier.entity';
import { ExigenceDossierPorteeEntity } from './exigence-dossier-portee.entity';

@Injectable()
export class ExigenceDossierService {
  constructor(
    @InjectRepository(ExigenceDossierEntity)
    private readonly exigenceRepo: Repository<ExigenceDossierEntity>,
    @InjectRepository(ExigenceDossierPorteeEntity)
    private readonly porteeRepo: Repository<ExigenceDossierPorteeEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
    @InjectRepository(GroupesEntity)
    private readonly groupeRepo: Repository<GroupesEntity>,
    @InjectRepository(TarifInscriptionEntity)
    private readonly tarifRepo: Repository<TarifInscriptionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async list(projectId: number, saisonId?: number | null) {
    if (saisonId) await this.assertSeason(saisonId, projectId);
    const exigences = await this.exigenceRepo.find({
      where: saisonId
        ? [
            { project_id: projectId, saison_id: saisonId },
            { project_id: projectId, saison_id: IsNull() },
          ]
        : { project_id: projectId },
      order: { usage: 'ASC', ordre: 'ASC', libelle: 'ASC' },
    });
    return this.withScopes(exigences);
  }

  async create(dto: SaveExigenceDossierDto, projectId: number) {
    await this.validateDto(dto, projectId);
    const code = dto.code.trim().toUpperCase();
    await this.assertUnique(code, dto.saison_id ?? null, projectId);

    const id = await this.dataSource.transaction(async (manager) => {
      const exigenceRepo = manager.getRepository(ExigenceDossierEntity);
      const porteeRepo = manager.getRepository(ExigenceDossierPorteeEntity);
      const saved = await exigenceRepo.save(
        exigenceRepo.create({
          project_id: projectId,
          saison_id: dto.saison_id ?? null,
          code,
          libelle: dto.libelle.trim(),
          description: this.text(dto.description),
          usage: dto.usage,
          type_exigence: dto.type_exigence,
          source_code: this.text(dto.source_code)?.toUpperCase() ?? null,
          type_reponse: dto.type_reponse,
          obligatoire: dto.obligatoire,
          bloquante: dto.bloquante,
          age_min: dto.age_min ?? null,
          age_max: dto.age_max ?? null,
          validite_mois: dto.validite_mois ?? null,
          texte_consentement: this.text(dto.texte_consentement),
          version_texte: this.text(dto.version_texte),
          ordre: dto.ordre,
          actif: dto.actif,
          updated_at: new Date(),
        }),
      );
      await porteeRepo.save(
        dto.portees.map((portee) =>
          porteeRepo.create({
            exigence_id: saved.id,
            type_portee: portee.type_portee,
            cible_id: portee.cible_id ?? null,
            cible_code: this.text(portee.cible_code)?.toUpperCase() ?? null,
          }),
        ),
      );
      return saved.id;
    });
    return this.get(id, projectId);
  }

  async update(id: number, dto: UpdateExigenceDossierDto, projectId: number) {
    const entity = await this.getEntity(id, projectId);
    await this.validateDto(dto, projectId);
    const code = dto.code.trim().toUpperCase();
    await this.assertUnique(code, dto.saison_id ?? null, projectId, id);

    await this.dataSource.transaction(async (manager) => {
      const exigenceRepo = manager.getRepository(ExigenceDossierEntity);
      const porteeRepo = manager.getRepository(ExigenceDossierPorteeEntity);
      Object.assign(entity, {
        saison_id: dto.saison_id ?? null,
        code,
        libelle: dto.libelle.trim(),
        description: this.text(dto.description),
        usage: dto.usage,
        type_exigence: dto.type_exigence,
        source_code: this.text(dto.source_code)?.toUpperCase() ?? null,
        type_reponse: dto.type_reponse,
        obligatoire: dto.obligatoire,
        bloquante: dto.bloquante,
        age_min: dto.age_min ?? null,
        age_max: dto.age_max ?? null,
        validite_mois: dto.validite_mois ?? null,
        texte_consentement: this.text(dto.texte_consentement),
        version_texte: this.text(dto.version_texte),
        ordre: dto.ordre,
        actif: dto.actif,
        updated_at: new Date(),
      });
      await exigenceRepo.save(entity);
      await porteeRepo.delete({ exigence_id: id });
      await porteeRepo.save(
        dto.portees.map((portee) =>
          porteeRepo.create({
            exigence_id: id,
            type_portee: portee.type_portee,
            cible_id: portee.cible_id ?? null,
            cible_code: this.text(portee.cible_code)?.toUpperCase() ?? null,
          }),
        ),
      );
    });
    return this.get(id, projectId);
  }

  async remove(id: number, projectId: number) {
    const entity = await this.getEntity(id, projectId);
    await this.exigenceRepo.remove(entity);
    return { ok: true };
  }

  private async get(id: number, projectId: number) {
    const entity = await this.getEntity(id, projectId);
    return (await this.withScopes([entity]))[0];
  }

  private async withScopes(exigences: ExigenceDossierEntity[]) {
    const scopes = exigences.length
      ? await this.porteeRepo.find({
          where: { exigence_id: In(exigences.map((item) => item.id)) },
          order: { id: 'ASC' },
        })
      : [];
    return exigences.map((item) => ({
      ...item,
      portees: scopes.filter((scope) => scope.exigence_id === item.id),
    }));
  }

  private async getEntity(id: number, projectId: number) {
    const entity = await this.exigenceRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Exigence introuvable');
    if (entity.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
    return entity;
  }

  private async validateDto(dto: SaveExigenceDossierDto, projectId: number) {
    if (!dto.code.trim()) throw new BadRequestException('Le code est obligatoire');
    if (!dto.libelle.trim()) throw new BadRequestException('Le libellé est obligatoire');
    if (!dto.portees.length) {
      throw new BadRequestException('Ajoute au moins une portée');
    }
    if (dto.age_min != null && dto.age_max != null && dto.age_min > dto.age_max) {
      throw new BadRequestException("L'âge minimum dépasse l'âge maximum");
    }
    if (dto.saison_id) await this.assertSeason(dto.saison_id, projectId);

    const groupIds = dto.portees
      .filter((item) => item.type_portee === 'GROUPE')
      .map((item) => Number(item.cible_id));
    if (groupIds.length) {
      const groups = await this.groupeRepo.find({ where: { id: In(groupIds) } });
      if (
        groups.length !== new Set(groupIds).size ||
        groups.some((group) => dto.saison_id && group.saison_id !== dto.saison_id)
      ) {
        throw new BadRequestException('Une portée groupe est invalide');
      }
    }

    const tariffIds = dto.portees
      .filter((item) => item.type_portee === 'TARIF')
      .map((item) => Number(item.cible_id));
    if (tariffIds.length) {
      const tariffs = await this.tarifRepo.find({ where: { id: In(tariffIds) } });
      if (
        tariffs.length !== new Set(tariffIds).size ||
        tariffs.some((tariff) => dto.saison_id && tariff.saison_id !== dto.saison_id)
      ) {
        throw new BadRequestException('Une portée tarif est invalide');
      }
    }

    for (const scope of dto.portees) {
      if (scope.type_portee === 'GENERAL' && (scope.cible_id || scope.cible_code)) {
        throw new BadRequestException('La portée générale ne prend pas de cible');
      }
      if (
        (scope.type_portee === 'GROUPE' || scope.type_portee === 'TARIF') &&
        !scope.cible_id
      ) {
        throw new BadRequestException('La portée sélectionnée nécessite une cible');
      }
      if (scope.type_portee === 'TYPE_LICENCE' && !this.text(scope.cible_code)) {
        throw new BadRequestException('Le type de licence est obligatoire');
      }
    }

    if (dto.type_exigence === 'CHAMP_PERSONNE' && !this.text(dto.source_code)) {
      throw new BadRequestException('Le champ personne à contrôler est obligatoire');
    }
    if (dto.type_exigence === 'CONTACT' && !this.text(dto.source_code)) {
      throw new BadRequestException('Le type de contact est obligatoire');
    }
    if (dto.type_exigence === 'DOCUMENT' && !this.text(dto.source_code)) {
      throw new BadRequestException('Le type de document est obligatoire');
    }
    if (dto.type_exigence === 'CONSENTEMENT') {
      if (dto.type_reponse !== 'BOOLEEN') {
        throw new BadRequestException('Un consentement attend une réponse oui/non');
      }
      if (!this.text(dto.texte_consentement) || !this.text(dto.version_texte)) {
        throw new BadRequestException('Le texte et sa version sont obligatoires');
      }
    }
  }

  private async assertSeason(id: number, projectId: number) {
    const season = await this.saisonRepo.findOne({ where: { id } });
    if (!season) throw new NotFoundException('Saison introuvable');
    if (season.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
  }

  private async assertUnique(
    code: string,
    seasonId: number | null,
    projectId: number,
    exceptId?: number,
  ) {
    const query = this.exigenceRepo
      .createQueryBuilder('item')
      .where('item.project_id = :projectId', { projectId })
      .andWhere('COALESCE(item.saison_id, 0) = COALESCE(:seasonId, 0)', { seasonId })
      .andWhere('LOWER(BTRIM(item.code)) = LOWER(BTRIM(:code))', { code });
    if (exceptId) query.andWhere('item.id <> :exceptId', { exceptId });
    if (await query.getOne()) {
      throw new BadRequestException('Ce code existe déjà pour cette portée saisonnière');
    }
  }

  private text(value: string | null | undefined): string | null {
    const result = (value ?? '').trim();
    return result || null;
  }
}

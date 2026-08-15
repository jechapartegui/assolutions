import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  Repository,
} from 'typeorm';

import { CompteBancaireEntity } from '../compte_bancaire/compte_bancaire.entity';
import { GroupesEntity } from '../groupes/groupes.entity';
import { SaisonEntity } from '../saison/saison.entity';
import {
  CreateTarifInscriptionDto,
  UpdateTarifInscriptionDto,
} from './tarif_inscription.dto';
import { GroupeTarifInscriptionEntity } from './groupe_tarif_inscription.entity';
import { TarifInscriptionEntity } from './tarif_inscription.entity';

export interface TarifInscriptionResponse {
  id: number;
  saison_id: number;
  nom: string;
  prix_centimes: number;
  compte_bancaire_id: number | null;
  date_debut_validite: string | null;
  date_fin_validite: string | null;
  reinscription: boolean;
  paiement_plusieurs_fois: number;
  age_min: number | null;
  age_max: number | null;
  naissance_avant: number | null;
  naissance_apres: number | null;
  limit_nb: number | null;
  actif: boolean;
  ordre: number;
  groupe_ids: number[];
  date_creation: Date;
  date_maj: Date;
}

type EligibilityCriteria = Pick<
  TarifInscriptionEntity,
  | 'age_min'
  | 'age_max'
  | 'naissance_avant'
  | 'naissance_apres'
  | 'limit_nb'
>;

@Injectable()
export class TarifInscriptionService {
  constructor(
    @InjectRepository(TarifInscriptionEntity)
    private readonly tarifRepo: Repository<TarifInscriptionEntity>,

    @InjectRepository(GroupeTarifInscriptionEntity)
    private readonly liaisonRepo: Repository<GroupeTarifInscriptionEntity>,

    @InjectRepository(GroupesEntity)
    private readonly groupeRepo: Repository<GroupesEntity>,

    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,

    private readonly dataSource: DataSource,
  ) {}

  async listForProject(
    saisonId: number,
    projectId: number,
  ): Promise<TarifInscriptionResponse[]> {
    await this.assertSaisonInProject(saisonId, projectId);

    const items = await this.tarifRepo.find({
      where: { saison_id: saisonId },
      relations: { groupe_liens: true },
      order: {
        ordre: 'ASC',
        nom: 'ASC',
      },
    });

    return items.map((item) => this.toResponse(item));
  }

  async getForProject(
    id: number,
    projectId: number,
  ): Promise<TarifInscriptionResponse> {
    const item = await this.getEntityForProject(id, projectId);
    return this.toResponse(item);
  }

  async create(
    dto: CreateTarifInscriptionDto,
    projectId: number,
  ): Promise<TarifInscriptionResponse> {
    const saisonId = Number(dto.saison_id);
    await this.assertSaisonInProject(saisonId, projectId);

    const normalized = this.normalizeCreate(dto);
    this.validateTarif(normalized);
    await this.assertUniqueName(
      normalized.nom,
      normalized.saison_id,
    );
    await this.assertCompteBancaireInProject(
      normalized.compte_bancaire_id ?? null,
      projectId,
    );

    const groupIds = this.normalizeGroupIds(dto.groupe_ids);
    await this.assertGroupsInSaison(groupIds, saisonId);

    const savedId = await this.dataSource.transaction(
      async (manager) => {
        const repo = manager.getRepository(TarifInscriptionEntity);
        const entity = repo.create(normalized);
        const saved = await repo.save(entity);

        await this.replaceGroupLinks(
          manager,
          saved.id,
          groupIds,
        );

        return saved.id;
      },
    );

    return this.getForProject(savedId, projectId);
  }

  async update(
    id: number,
    dto: UpdateTarifInscriptionDto,
    projectId: number,
  ): Promise<TarifInscriptionResponse> {
    const current = await this.getEntityForProject(id, projectId);

    const saisonId =
      dto.saison_id !== undefined
        ? Number(dto.saison_id)
        : current.saison_id;

    if (saisonId !== current.saison_id) {
      await this.assertSaisonInProject(saisonId, projectId);
    }

    const normalized = this.normalizeUpdate(current, dto, saisonId);
    this.validateTarif(normalized);

    await this.assertUniqueName(
      normalized.nom,
      saisonId,
      current.id,
    );
    await this.assertCompteBancaireInProject(
      normalized.compte_bancaire_id ?? null,
      projectId,
    );

    const currentGroupIds = (current.groupe_liens ?? [])
      .map((liaison) => Number(liaison.groupe_id))
      .filter((groupId) => groupId > 0);

    const groupIds =
      dto.groupe_ids !== undefined
        ? this.normalizeGroupIds(dto.groupe_ids)
        : currentGroupIds;

    await this.assertGroupsInSaison(groupIds, saisonId);

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(TarifInscriptionEntity);

      Object.assign(current, normalized, {
        updated_at: new Date(),
      });

      await repo.save(current);
      await this.replaceGroupLinks(manager, current.id, groupIds);
    });

    return this.getForProject(current.id, projectId);
  }

  async remove(
    id: number,
    projectId: number,
  ): Promise<{ ok: true }> {
    const current = await this.getEntityForProject(id, projectId);
    await this.tarifRepo.remove(current);

    return { ok: true };
  }

  private async getEntityForProject(
    id: number,
    projectId: number,
  ): Promise<TarifInscriptionEntity> {
    const item = await this.tarifRepo.findOne({
      where: { id: Number(id) },
      relations: { groupe_liens: true },
    });

    if (!item) {
      throw new NotFoundException(
        `tarif d'inscription ${id} introuvable`,
      );
    }

    await this.assertSaisonInProject(item.saison_id, projectId);
    return item;
  }

  private async assertSaisonInProject(
    saisonId: number,
    projectId: number,
  ): Promise<void> {
    const saison = await this.saisonRepo.findOne({
      where: { id: Number(saisonId) },
    });

    if (!saison) {
      throw new NotFoundException(
        `saison ${saisonId} introuvable`,
      );
    }

    if (Number(saison.project_id) !== Number(projectId)) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
  }

  private async assertCompteBancaireInProject(
    compteBancaireId: number | null | undefined,
    projectId: number,
  ): Promise<void> {
    if (!compteBancaireId) return;

    const compte = await this.dataSource
      .getRepository(CompteBancaireEntity)
      .findOne({ where: { id: Number(compteBancaireId) } });

    if (!compte) {
      throw new NotFoundException(
        `compte bancaire ${compteBancaireId} introuvable`,
      );
    }

    if (Number(compte.project_id) !== Number(projectId)) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
  }

  private async assertGroupsInSaison(
    groupIds: number[],
    saisonId: number,
  ): Promise<void> {
    if (groupIds.length === 0) {
      return;
    }

    const groupes = await this.groupeRepo.find({
      where: { id: In(groupIds) },
    });

    if (groupes.length !== groupIds.length) {
      const found = new Set(groupes.map((groupe) => Number(groupe.id)));
      const missing = groupIds.filter((id) => !found.has(id));

      throw new NotFoundException(
        `groupe(s) introuvable(s) : ${missing.join(', ')}`,
      );
    }

    const wrongSaison = groupes.filter(
      (groupe) => Number(groupe.saison_id) !== Number(saisonId),
    );

    if (wrongSaison.length > 0) {
      throw new BadRequestException(
        "Tous les groupes liés au tarif doivent appartenir à la même saison",
      );
    }
  }

  private async assertUniqueName(
    nom: string,
    saisonId: number,
    excludedId?: number,
  ): Promise<void> {
    const query = this.tarifRepo
      .createQueryBuilder('tarif')
      .where('tarif.saison_id = :saisonId', { saisonId })
      .andWhere(
        'LOWER(BTRIM(tarif.nom)) = LOWER(BTRIM(:nom))',
        { nom },
      );

    if (excludedId) {
      query.andWhere('tarif.id <> :excludedId', { excludedId });
    }

    const existing = await query.getOne();

    if (existing) {
      throw new ConflictException(
        `Un tarif nommé "${nom}" existe déjà pour cette saison`,
      );
    }
  }

  private normalizeCreate(
    dto: CreateTarifInscriptionDto,
  ): Partial<TarifInscriptionEntity> &
    Pick<
      TarifInscriptionEntity,
      | 'saison_id'
      | 'nom'
      | 'prix_centimes'
      | 'reinscription'
      | 'paiement_plusieurs_fois'
      | 'actif'
      | 'ordre'
    > {
    return {
      saison_id: Number(dto.saison_id),
      nom: (dto.nom ?? '').trim(),
      prix_centimes: Number(dto.prix_centimes),
      compte_bancaire_id: this.normalizeOptionalInteger(
        dto.compte_bancaire_id,
      ),
      date_debut_validite:
        this.normalizeOptionalDate(dto.date_debut_validite),
      date_fin_validite:
        this.normalizeOptionalDate(dto.date_fin_validite),
      reinscription: !!dto.reinscription,
      paiement_plusieurs_fois:
        Number(dto.paiement_plusieurs_fois ?? 1),
      age_min: this.normalizeOptionalInteger(dto.age_min),
      age_max: this.normalizeOptionalInteger(dto.age_max),
      naissance_avant: this.normalizeOptionalInteger(
        dto.naissance_avant,
      ),
      naissance_apres: this.normalizeOptionalInteger(
        dto.naissance_apres,
      ),
      limit_nb: this.normalizeOptionalInteger(dto.limit_nb),
      actif: dto.actif ?? true,
      ordre: Number(dto.ordre ?? 0),
    };
  }

  private normalizeUpdate(
    current: TarifInscriptionEntity,
    dto: UpdateTarifInscriptionDto,
    saisonId: number,
  ): Partial<TarifInscriptionEntity> &
    Pick<
      TarifInscriptionEntity,
      | 'saison_id'
      | 'nom'
      | 'prix_centimes'
      | 'reinscription'
      | 'paiement_plusieurs_fois'
      | 'actif'
      | 'ordre'
    > {
    return {
      saison_id: saisonId,
      nom:
        dto.nom !== undefined
          ? dto.nom.trim()
          : current.nom,
      prix_centimes:
        dto.prix_centimes !== undefined
          ? Number(dto.prix_centimes)
          : current.prix_centimes,
      compte_bancaire_id:
        dto.compte_bancaire_id !== undefined
          ? this.normalizeOptionalInteger(dto.compte_bancaire_id)
          : current.compte_bancaire_id,
      date_debut_validite:
        dto.date_debut_validite !== undefined
          ? this.normalizeOptionalDate(dto.date_debut_validite)
          : current.date_debut_validite,
      date_fin_validite:
        dto.date_fin_validite !== undefined
          ? this.normalizeOptionalDate(dto.date_fin_validite)
          : current.date_fin_validite,
      reinscription:
        dto.reinscription !== undefined
          ? !!dto.reinscription
          : current.reinscription,
      paiement_plusieurs_fois:
        dto.paiement_plusieurs_fois !== undefined
          ? Number(dto.paiement_plusieurs_fois)
          : current.paiement_plusieurs_fois,
      age_min:
        dto.age_min !== undefined
          ? this.normalizeOptionalInteger(dto.age_min)
          : current.age_min,
      age_max:
        dto.age_max !== undefined
          ? this.normalizeOptionalInteger(dto.age_max)
          : current.age_max,
      naissance_avant:
        dto.naissance_avant !== undefined
          ? this.normalizeOptionalInteger(
              dto.naissance_avant,
            )
          : current.naissance_avant,
      naissance_apres:
        dto.naissance_apres !== undefined
          ? this.normalizeOptionalInteger(
              dto.naissance_apres,
            )
          : current.naissance_apres,
      limit_nb:
        dto.limit_nb !== undefined
          ? this.normalizeOptionalInteger(dto.limit_nb)
          : current.limit_nb,
      actif:
        dto.actif !== undefined
          ? !!dto.actif
          : current.actif,
      ordre:
        dto.ordre !== undefined
          ? Number(dto.ordre)
          : current.ordre,
    };
  }

  private validateTarif(
    tarif: Partial<TarifInscriptionEntity>,
  ): void {
    const nom = (tarif.nom ?? '').trim();

    if (!nom) {
      throw new BadRequestException(
        "Le nom du tarif est obligatoire",
      );
    }

    if (
      tarif.prix_centimes === undefined
      || !Number.isInteger(tarif.prix_centimes)
      || tarif.prix_centimes < 0
    ) {
      throw new BadRequestException(
        "Le prix doit être un montant positif exprimé en centimes",
      );
    }

    if (
      tarif.compte_bancaire_id !== null
      && tarif.compte_bancaire_id !== undefined
      && (
        !Number.isInteger(tarif.compte_bancaire_id)
        || tarif.compte_bancaire_id < 1
      )
    ) {
      throw new BadRequestException(
        "Le compte bancaire du tarif est invalide",
      );
    }

    if (
      tarif.paiement_plusieurs_fois === undefined
      || !Number.isInteger(tarif.paiement_plusieurs_fois)
      || tarif.paiement_plusieurs_fois < 1
      || tarif.paiement_plusieurs_fois > 12
    ) {
      throw new BadRequestException(
        "Le nombre maximal d'échéances doit être compris entre 1 et 12",
      );
    }

    if (
      tarif.ordre === undefined
      || !Number.isInteger(tarif.ordre)
    ) {
      throw new BadRequestException(
        "L'ordre d'affichage doit être un entier",
      );
    }

    const criteria = tarif as EligibilityCriteria;

    this.validateOptionalNonNegativeInteger(
      "L'âge minimum",
      criteria.age_min,
    );
    this.validateOptionalNonNegativeInteger(
      "L'âge maximum",
      criteria.age_max,
    );
    this.validateOptionalNonNegativeInteger(
      "L'année de naissance de début",
      criteria.naissance_avant,
    );
    this.validateOptionalNonNegativeInteger(
      "L'année de naissance de fin",
      criteria.naissance_apres,
    );

    if (
      criteria.limit_nb !== null
      && criteria.limit_nb !== undefined
      && (
        !Number.isInteger(criteria.limit_nb)
        || criteria.limit_nb < 1
      )
    ) {
      throw new BadRequestException(
        "La limite de souscriptions doit être un entier supérieur à zéro",
      );
    }

    if (
      criteria.age_min !== null
      && criteria.age_min !== undefined
      && criteria.age_max !== null
      && criteria.age_max !== undefined
      && criteria.age_min > criteria.age_max
    ) {
      throw new BadRequestException(
        "L'âge minimum ne peut pas dépasser l'âge maximum",
      );
    }

    if (
      criteria.naissance_avant !== null
      && criteria.naissance_avant !== undefined
      && criteria.naissance_apres !== null
      && criteria.naissance_apres !== undefined
      && criteria.naissance_avant
        > criteria.naissance_apres
    ) {
      throw new BadRequestException(
        "L'année de naissance de début ne peut pas dépasser l'année de fin",
      );
    }

    if (
      tarif.date_debut_validite
      && tarif.date_fin_validite
      && tarif.date_debut_validite > tarif.date_fin_validite
    ) {
      throw new BadRequestException(
        "La date de début de validité ne peut pas dépasser la date de fin",
      );
    }
  }

  private validateOptionalNonNegativeInteger(
    label: string,
    value: number | null | undefined,
  ): void {
    if (
      value !== null
      && value !== undefined
      && (!Number.isInteger(value) || value < 0)
    ) {
      throw new BadRequestException(
        `${label} doit être un entier positif`,
      );
    }
  }

  private normalizeOptionalInteger(
    value: number | null | undefined,
  ): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const normalized = Number(value);
    return Number.isFinite(normalized)
      ? normalized
      : null;
  }

  private normalizeOptionalDate(
    value: string | null | undefined,
  ): string | null {
    const normalized = (value ?? '').trim();
    return normalized ? normalized.slice(0, 10) : null;
  }

  private normalizeGroupIds(
    values: number[] | null | undefined,
  ): number[] {
    return Array.from(
      new Set(
        (values ?? [])
          .map((value) => Number(value))
          .filter(
            (value) =>
              Number.isInteger(value) && value > 0,
          ),
      ),
    ).sort((a, b) => a - b);
  }

  private async replaceGroupLinks(
    manager: EntityManager,
    tarifId: number,
    groupIds: number[],
  ): Promise<void> {
    const repo = manager.getRepository(
      GroupeTarifInscriptionEntity,
    );

    await repo.delete({
      tarif_inscription_id: Number(tarifId),
    });

    if (groupIds.length === 0) {
      return;
    }

    const rows = groupIds.map((groupeId) =>
      repo.create({
        groupe_id: groupeId,
        tarif_inscription_id: Number(tarifId),
      }),
    );

    await repo.save(rows);
  }

  private toResponse(
    item: TarifInscriptionEntity,
  ): TarifInscriptionResponse {
    return {
      id: Number(item.id),
      saison_id: Number(item.saison_id),
      nom: item.nom,
      prix_centimes: Number(item.prix_centimes),
      compte_bancaire_id: item.compte_bancaire_id ?? null,
      date_debut_validite:
        item.date_debut_validite ?? null,
      date_fin_validite:
        item.date_fin_validite ?? null,
      reinscription: !!item.reinscription,
      paiement_plusieurs_fois:
        Number(item.paiement_plusieurs_fois),
      age_min: item.age_min ?? null,
      age_max: item.age_max ?? null,
      naissance_avant:
        item.naissance_avant ?? null,
      naissance_apres:
        item.naissance_apres ?? null,
      limit_nb: item.limit_nb ?? null,
      actif: !!item.actif,
      ordre: Number(item.ordre ?? 0),
      groupe_ids: Array.from(
        new Set(
          (item.groupe_liens ?? [])
            .map((liaison) => Number(liaison.groupe_id))
            .filter((groupeId) => groupeId > 0),
        ),
      ).sort((a, b) => a - b),
      date_creation: item.created_at,
      date_maj: item.updated_at,
    };
  }
}
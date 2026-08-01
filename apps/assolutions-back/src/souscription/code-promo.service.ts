import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { SaisonEntity } from '../saison/saison.entity';
import { TarifInscriptionEntity } from '../tarif_inscription/tarif_inscription.entity';
import { CodePromoEntity } from './code-promo.entity';
import { CodePromoTarifEntity } from './code-promo-tarif.entity';
import { SaveCodePromoDto, UpdateCodePromoDto } from './code-promo.dto';

@Injectable()
export class CodePromoService {
  constructor(
    @InjectRepository(CodePromoEntity)
    private readonly promoRepo: Repository<CodePromoEntity>,
    @InjectRepository(CodePromoTarifEntity)
    private readonly linkRepo: Repository<CodePromoTarifEntity>,
    @InjectRepository(TarifInscriptionEntity)
    private readonly tarifRepo: Repository<TarifInscriptionEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async list(saisonId: number, projectId: number) {
    await this.assertSeason(saisonId, projectId);
    const promos = await this.promoRepo.find({
      where: { saison_id: saisonId, project_id: projectId },
      order: { actif: 'DESC', code: 'ASC' },
    });
    const links = promos.length
      ? await this.linkRepo.find({
          where: { code_promo_id: In(promos.map((promo) => promo.id)) },
        })
      : [];
    return promos.map((promo) => ({
      ...promo,
      tarif_ids: links
        .filter((link) => link.code_promo_id === promo.id)
        .map((link) => link.tarif_inscription_id),
    }));
  }

  async create(dto: SaveCodePromoDto, projectId: number) {
    await this.assertSeason(dto.saison_id, projectId);
    await this.assertTariffs(dto.tarif_ids, dto.saison_id);
    this.validate(dto);
    const code = dto.code.trim().toUpperCase();
    const duplicate = await this.promoRepo
      .createQueryBuilder('promo')
      .where('promo.saison_id = :saisonId', { saisonId: dto.saison_id })
      .andWhere('LOWER(BTRIM(promo.code)) = LOWER(BTRIM(:code))', { code })
      .getOne();
    if (duplicate) throw new BadRequestException('Ce code existe déjà pour cette saison');

    const id = await this.dataSource.transaction(async (manager) => {
      const promoRepo = manager.getRepository(CodePromoEntity);
      const linkRepo = manager.getRepository(CodePromoTarifEntity);
      const saved = await promoRepo.save(
        promoRepo.create({
          project_id: projectId,
          saison_id: dto.saison_id,
          code,
          libelle: dto.libelle.trim(),
          type_remise: dto.type_remise,
          valeur: dto.valeur,
          montant_min_centimes: dto.montant_min_centimes ?? null,
          max_remise_centimes: dto.max_remise_centimes ?? null,
          date_debut: dto.date_debut || null,
          date_fin: dto.date_fin || null,
          limit_nb: dto.limit_nb ?? null,
          actif: dto.actif,
          updated_at: new Date(),
        }),
      );
      if (dto.tarif_ids.length) {
        await linkRepo.save(
          dto.tarif_ids.map((tarifId) =>
            linkRepo.create({
              code_promo_id: saved.id,
              tarif_inscription_id: tarifId,
            }),
          ),
        );
      }
      return saved.id;
    });
    return this.get(id, projectId);
  }

  async update(id: number, dto: UpdateCodePromoDto, projectId: number) {
    const promo = await this.getEntity(id, projectId);
    await this.assertSeason(dto.saison_id, projectId);
    await this.assertTariffs(dto.tarif_ids, dto.saison_id);
    this.validate(dto);
    const code = dto.code.trim().toUpperCase();
    const duplicate = await this.promoRepo
      .createQueryBuilder('other')
      .where('other.saison_id = :saisonId', { saisonId: dto.saison_id })
      .andWhere('LOWER(BTRIM(other.code)) = LOWER(BTRIM(:code))', { code })
      .andWhere('other.id <> :id', { id })
      .getOne();
    if (duplicate) throw new BadRequestException('Ce code existe déjà pour cette saison');

    await this.dataSource.transaction(async (manager) => {
      const promoRepo = manager.getRepository(CodePromoEntity);
      const linkRepo = manager.getRepository(CodePromoTarifEntity);
      Object.assign(promo, {
        saison_id: dto.saison_id,
        code,
        libelle: dto.libelle.trim(),
        type_remise: dto.type_remise,
        valeur: dto.valeur,
        montant_min_centimes: dto.montant_min_centimes ?? null,
        max_remise_centimes: dto.max_remise_centimes ?? null,
        date_debut: dto.date_debut || null,
        date_fin: dto.date_fin || null,
        limit_nb: dto.limit_nb ?? null,
        actif: dto.actif,
        updated_at: new Date(),
      });
      await promoRepo.save(promo);
      await linkRepo.delete({ code_promo_id: id });
      if (dto.tarif_ids.length) {
        await linkRepo.save(
          dto.tarif_ids.map((tarifId) =>
            linkRepo.create({ code_promo_id: id, tarif_inscription_id: tarifId }),
          ),
        );
      }
    });
    return this.get(id, projectId);
  }

  async remove(id: number, projectId: number) {
    const promo = await this.getEntity(id, projectId);
    await this.promoRepo.remove(promo);
    return { ok: true };
  }

  private async get(id: number, projectId: number) {
    const promo = await this.getEntity(id, projectId);
    const links = await this.linkRepo.find({ where: { code_promo_id: id } });
    return {
      ...promo,
      tarif_ids: links.map((link) => link.tarif_inscription_id),
    };
  }

  private async getEntity(id: number, projectId: number) {
    const promo = await this.promoRepo.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('Code promotionnel introuvable');
    if (promo.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
    return promo;
  }

  private async assertSeason(saisonId: number, projectId: number) {
    const season = await this.saisonRepo.findOne({ where: { id: saisonId } });
    if (!season) throw new NotFoundException('Saison introuvable');
    if (season.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
  }

  private async assertTariffs(ids: number[], seasonId: number) {
    if (!ids.length) return;
    const tariffs = await this.tarifRepo.find({ where: { id: In(ids) } });
    if (
      tariffs.length !== ids.length ||
      tariffs.some((tariff) => tariff.saison_id !== seasonId)
    ) {
      throw new BadRequestException('Un tarif sélectionné ne correspond pas à la saison');
    }
  }

  private validate(dto: SaveCodePromoDto) {
    if (!dto.code.trim()) throw new BadRequestException('Le code est obligatoire');
    if (!dto.libelle.trim()) throw new BadRequestException('Le libellé est obligatoire');
    if (dto.type_remise === 'POURCENTAGE' && dto.valeur > 100) {
      throw new BadRequestException('Le pourcentage ne peut pas dépasser 100');
    }
    if (dto.date_debut && dto.date_fin && dto.date_debut > dto.date_fin) {
      throw new BadRequestException('La date de début dépasse la date de fin');
    }
  }
}

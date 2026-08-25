import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompteEntity } from '../compte/compte.entity';
import { LienGroupeEntity } from '../lien_groupe/lien_groupe.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { SeanceEntity } from '../seance/seance.entity';
import {
  CreateInscriptionSeanceDto,
  UpdateInscriptionSeanceDto,
} from './inscription_seance.dto';
import { InscriptionSeanceEntity } from './inscription_seance.entity';
import { InscriptionSeanceService } from './inscription_seance.service';

/**
 * La capacité d'une séance concerne les inscriptions potentielles et non la
 * présence constatée le jour J. Sont donc comptées les inscriptions
 * statut_inscription = présent / essai. statut_seance ne participe jamais à
 * ce contrôle.
 */
@Injectable()
export class CapacityAwareInscriptionSeanceService extends InscriptionSeanceService {
  constructor(
    @InjectRepository(InscriptionSeanceEntity)
    private readonly capacityRepo: Repository<InscriptionSeanceEntity>,
    @InjectRepository(SeanceEntity)
    private readonly capacitySeanceRepo: Repository<SeanceEntity>,
    @InjectRepository(SaisonEntity)
    saisonRepo: Repository<SaisonEntity>,
    @InjectRepository(PersonneEntity)
    personneRepo: Repository<PersonneEntity>,
    @InjectRepository(CompteEntity)
    compteRepo: Repository<CompteEntity>,
    @InjectRepository(LienGroupeEntity)
    lienGroupeRepo: Repository<LienGroupeEntity>,
  ) {
    super(
      capacityRepo,
      capacitySeanceRepo,
      saisonRepo,
      personneRepo,
      compteRepo,
      lienGroupeRepo,
    );
  }

  override async upsert(dto: CreateInscriptionSeanceDto, projectId: number) {
    await this.assertPotentialCapacity(
      dto.personne_id,
      dto.seance_id,
      dto.statut_inscription,
    );
    return super.upsert(dto, projectId);
  }

  override async create(dto: CreateInscriptionSeanceDto, projectId: number) {
    await this.assertPotentialCapacity(
      dto.personne_id,
      dto.seance_id,
      dto.statut_inscription,
    );
    return super.create(dto, projectId);
  }

  override async update(
    personneId: number,
    seanceId: number,
    dto: UpdateInscriptionSeanceDto,
    projectId: number,
  ) {
    if (dto.statut_inscription !== undefined) {
      await this.assertPotentialCapacity(
        personneId,
        seanceId,
        dto.statut_inscription,
      );
    }
    return super.update(personneId, seanceId, dto, projectId);
  }

  private async assertPotentialCapacity(
    personneId: number,
    seanceId: number,
    statutInscription: unknown,
  ): Promise<void> {
    if (!this.isPotentialStatus(statutInscription)) return;

    const seance = await this.capacitySeanceRepo.findOne({
      where: { seance_id: Number(seanceId) },
    });

    if (!seance?.est_place_maximum) return;

    const maximum = Number(seance.place_maximum ?? 0);
    if (!Number.isFinite(maximum) || maximum <= 0) return;

    const rows = (await this.capacityRepo.query(
      `
        SELECT COUNT(*)::int AS count
        FROM inscription_seance
        WHERE seance_id = $1
          AND personne_id <> $2
          AND LOWER(statut_inscription::text) IN ('présent', 'present', 'essai')
      `,
      [Number(seanceId), Number(personneId)],
    )) as Array<{ count: number | string }>;

    const currentPotential = Number(rows[0]?.count ?? 0);
    if (currentPotential >= maximum) {
      throw new ConflictException('SEANCE_FULL');
    }
  }

  private isPotentialStatus(value: unknown): boolean {
    const normalized = String(value ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return normalized === 'present' || normalized === 'essai';
  }
}

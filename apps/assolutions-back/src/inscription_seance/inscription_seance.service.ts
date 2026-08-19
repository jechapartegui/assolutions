import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InscriptionSeance,
  InscriptionStatus_VM,
  Personne_VM,
  SeanceStatus_VM,
} from '@shared/index';
import { AccessControlService } from '../common/access-control.service';
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

@Injectable()
export class InscriptionSeanceService {
  constructor(
    @InjectRepository(InscriptionSeanceEntity)
    private readonly repo: Repository<InscriptionSeanceEntity>,
    @InjectRepository(SeanceEntity)
    private readonly seanceRepo: Repository<SeanceEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
    @InjectRepository(PersonneEntity)
    private readonly personneRepo: Repository<PersonneEntity>,
    @InjectRepository(CompteEntity)
    private readonly compteRepo: Repository<CompteEntity>,
    @InjectRepository(LienGroupeEntity)
    private readonly lienGroupeRepo: Repository<LienGroupeEntity>,
    private readonly access: AccessControlService,
  ) {}

  private async assertSeanceInProject(
    seanceId: number,
    projectId: number,
  ): Promise<SeanceEntity> {
    const seance = await this.seanceRepo.findOne({
      where: { seance_id: seanceId },
    });
    if (!seance) throw new NotFoundException(`seance ${seanceId} introuvable`);

    await this.assertSaisonInProject(seance.saison_id, projectId);
    return seance;
  }

  private async assertSaisonInProject(saisonId: number, projectId: number) {
    const saison = await this.saisonRepo.findOne({ where: { id: saisonId } });
    if (!saison) throw new NotFoundException(`saison ${saisonId} introuvable`);
    if (Number(saison.project_id) !== Number(projectId)) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
    return saison;
  }

  async full(seanceId: number, projectId: number): Promise<InscriptionSeance[]> {
    const seance = await this.assertSeanceInProject(seanceId, projectId);
    const result: InscriptionSeance[] = [];

    const inscriptions = await this.repo.find({
      where: { seance_id: seanceId },
      order: { date_inscription: 'DESC' },
    });

    for (const inscription of inscriptions) {
      result.push({
        project_id: projectId,
        personne_id: inscription.personne_id,
        seance_id: inscription.seance_id,
        date_inscription: inscription.date_inscription,
        statut_inscription: this.toInscriptionStatus(inscription.statut_inscription),
        statut_seance: this.toSeanceStatus(inscription.statut_seance),
      });
    }

    if (seance.convocation_nominative) return result;

    const personnesDejaDansResult = new Set(result.map((r) => Number(r.personne_id)));
    const groupes = await this.repo.query(
      `
      SELECT groupe_id
      FROM lien_groupe
      WHERE object_id = $1
        AND object_type = $2
      `,
      [seanceId, 'séance'],
    );

    for (const groupe of groupes) {
      const liensRiders = await this.repo.query(
        `
        SELECT object_id AS personne_id
        FROM lien_groupe
        WHERE groupe_id = $1
          AND object_type = $2
        `,
        [groupe.groupe_id, 'rider'],
      );

      for (const lien of liensRiders) {
        const personneId = Number(lien.personne_id);
        if (personnesDejaDansResult.has(personneId)) continue;

        const personnes = await this.repo.query(
          `SELECT * FROM personne WHERE id = $1`,
          [personneId],
        );
        if (!personnes.length) continue;

        const personne = personnes[0] as Personne_VM;
        if (personne.archive) continue;

        const age = this.getAge(personne.date_naissance);
        if (seance.age_minimum != null && age < seance.age_minimum) continue;
        if (seance.age_maximum != null && age > seance.age_maximum) continue;

        result.push({
          project_id: projectId,
          personne_id: personneId,
          seance_id: seanceId,
          date_inscription: null,
          statut_inscription: null,
          statut_seance: null,
        });
        personnesDejaDansResult.add(personneId);
      }
    }

    return result;
  }

  async listForProject(projectId: number) {
    return this.repo
      .createQueryBuilder('i')
      .innerJoin('seance', 'se', 'se.seance_id = i.seance_id')
      .innerJoin('saison', 'sa', 'sa.id = se.saison_id')
      .where('sa.project_id = :projectId', { projectId })
      .orderBy('i.date_inscription', 'DESC')
      .getMany();
  }

  async upsert(
    dto: CreateInscriptionSeanceDto,
    projectId: number,
    requesterId: number,
  ) {
    await this.assertSeanceInProject(dto.seance_id, projectId);
    const { isStaff } = await this.access.getPersonSelfOrStaff(
      requesterId,
      dto.personne_id,
      projectId,
    );
    this.assertAttendanceWriteAllowed(dto, isStaff);

    const existing = await this.repo.findOne({
      where: { personne_id: dto.personne_id, seance_id: dto.seance_id },
    });

    if (!existing) {
      return this.repo.save(this.repo.create({
        personne_id: dto.personne_id,
        seance_id: dto.seance_id,
        statut_inscription: dto.statut_inscription ?? null,
        statut_seance: isStaff ? dto.statut_seance ?? null : null,
        date_inscription: new Date(),
      } as any));
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'statut_inscription')) {
      existing.statut_inscription = dto.statut_inscription ?? null;
    }
    if (isStaff && Object.prototype.hasOwnProperty.call(dto, 'statut_seance')) {
      existing.statut_seance = dto.statut_seance ?? null;
    }
    existing.date_inscription = new Date();
    return this.repo.save(existing);
  }

  async create(
    dto: CreateInscriptionSeanceDto,
    projectId: number,
    requesterId: number,
  ) {
    await this.assertSeanceInProject(dto.seance_id, projectId);
    const { isStaff } = await this.access.getPersonSelfOrStaff(
      requesterId,
      dto.personne_id,
      projectId,
    );
    this.assertAttendanceWriteAllowed(dto, isStaff);

    return this.repo.save(this.repo.create({
      personne_id: dto.personne_id,
      seance_id: dto.seance_id,
      statut_inscription: dto.statut_inscription ?? null,
      statut_seance: isStaff ? dto.statut_seance ?? null : null,
    } as any));
  }

  async update(
    personneId: number,
    seanceId: number,
    dto: UpdateInscriptionSeanceDto,
    projectId: number,
    requesterId: number,
  ) {
    await this.assertSeanceInProject(seanceId, projectId);
    const { isStaff } = await this.access.getPersonSelfOrStaff(
      requesterId,
      personneId,
      projectId,
    );
    this.assertAttendanceWriteAllowed(dto, isStaff);

    let item = await this.repo.findOne({
      where: { personne_id: personneId, seance_id: seanceId },
    });

    if (!item) {
      item = this.repo.create({
        personne_id: personneId,
        seance_id: seanceId,
        statut_inscription: dto.statut_inscription ?? null,
        statut_seance: isStaff ? dto.statut_seance ?? null : null,
      } as any);
      return this.repo.save(item);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'statut_inscription')) {
      item.statut_inscription = dto.statut_inscription ?? null;
    }
    if (isStaff && Object.prototype.hasOwnProperty.call(dto, 'statut_seance')) {
      item.statut_seance = dto.statut_seance ?? null;
    }
    return this.repo.save(item);
  }

  async remove(
    personneId: number,
    seanceId: number,
    projectId: number,
    requesterId: number,
  ) {
    await this.assertSeanceInProject(seanceId, projectId);
    await this.access.getPersonSelfOrStaff(requesterId, personneId, projectId);

    const item = await this.repo.findOne({
      where: { personne_id: personneId, seance_id: seanceId },
    });
    if (!item) {
      throw new NotFoundException(`InscriptionSeance ${personneId}-${seanceId} introuvable`);
    }
    await this.repo.remove(item);
    return { ok: true };
  }

  async getForProject(
    personneId: number,
    seanceId: number,
    projectId: number,
    requesterId: number,
  ) {
    await this.assertSeanceInProject(seanceId, projectId);
    await this.access.getPersonSelfOrStaff(requesterId, personneId, projectId);

    const item = await this.repo.findOne({
      where: { personne_id: personneId, seance_id: seanceId },
    });
    if (!item) throw new NotFoundException('inscription_seance introuvable');
    return item;
  }

  async listBySaison(saisonId: number, projectId: number) {
    await this.assertSaisonInProject(saisonId, projectId);
    return this.repo
      .createQueryBuilder('i')
      .innerJoin('seance', 'se', 'se.seance_id = i.seance_id')
      .where('se.saison_id = :saisonId', { saisonId })
      .orderBy('i.date_inscription', 'DESC')
      .getMany();
  }

  async listBySaisonUniqueId(saisonId: number, projectId: number) {
    const inscriptions = await this.listBySaison(saisonId, projectId);
    return Array.from(new Set(inscriptions.map((i) => i.personne_id)));
  }

  async listByPersonneAndSaison(
    personneId: number,
    saisonId: number,
    projectId: number,
    requesterId: number,
  ) {
    await this.assertSaisonInProject(saisonId, projectId);
    await this.access.getPersonSelfOrStaff(requesterId, personneId, projectId);

    return this.repo
      .createQueryBuilder('i')
      .innerJoin('seance', 'se', 'se.seance_id = i.seance_id')
      .where('se.saison_id = :saisonId', { saisonId })
      .andWhere('i.personne_id = :personneId', { personneId })
      .orderBy('i.date_inscription', 'DESC')
      .getMany();
  }

  async getAdherentCompte(
    login: string,
    seanceId: number,
    projectId: number,
    requesterId: number,
    requesterLogin: string,
  ) {
    await this.assertSeanceInProject(seanceId, projectId);

    const normalizedLogin = String(login ?? '').trim().toLowerCase();
    const normalizedRequesterLogin = String(requesterLogin ?? '').trim().toLowerCase();
    if (normalizedLogin !== normalizedRequesterLogin) {
      await this.access.assertProjectStaff(requesterId, projectId);
    }

    const compte = await this.compteRepo.findOne({
      where: { login: normalizedLogin },
    });
    if (!compte) throw new NotFoundException('compte introuvable');

    await this.access.assertAccountSelfOrStaff(requesterId, compte.id, projectId);
    const personnes = await this.personneRepo.find({
      where: { compte: compte.id },
    });
    if (!personnes.length) return [];

    const personneIds = new Set(personnes.map((p) => Number(p.id)));
    const inscriptions = await this.full(seanceId, projectId);
    return inscriptions.filter((i) => personneIds.has(Number(i.personne_id)));
  }

  private assertAttendanceWriteAllowed(
    dto: CreateInscriptionSeanceDto | UpdateInscriptionSeanceDto,
    isStaff: boolean,
  ): void {
    if (
      !isStaff &&
      Object.prototype.hasOwnProperty.call(dto, 'statut_seance')
    ) {
      throw new ForbiddenException('ATTENDANCE_STATUS_STAFF_ONLY');
    }
  }

  private getAge(dateNaissance: Date | string): number {
    const naissance = new Date(dateNaissance);
    const today = new Date();
    let age = today.getFullYear() - naissance.getFullYear();
    const mois = today.getMonth() - naissance.getMonth();
    if (mois < 0 || (mois === 0 && today.getDate() < naissance.getDate())) age--;
    return age;
  }

  private toInscriptionStatus(value: any): InscriptionStatus_VM | null {
    if (!value) return null;
    const v = String(value).toLowerCase();
    if (v === 'présent' || v === 'present') return InscriptionStatus_VM.PRESENT;
    if (v === 'absent') return InscriptionStatus_VM.ABSENT;
    if (v === 'convoqué' || v === 'convoque') return InscriptionStatus_VM.CONVOQUE;
    if (v === 'essai') return InscriptionStatus_VM.ESSAI;
    return null;
  }

  private toSeanceStatus(value: any): SeanceStatus_VM | null {
    if (!value) return null;
    const v = String(value).toLowerCase();
    if (v === 'présent' || v === 'present') return SeanceStatus_VM.PRESENT;
    if (v === 'absent') return SeanceStatus_VM.ABSENT;
    return null;
  }
}

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AccessControlService } from '../common/access-control.service';
import { CoursEntity } from '../cours/cours.entity';
import { GroupesEntity } from '../groupes/groupes.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { SeanceEntity } from '../seance/seance.entity';
import { CreateLienGroupeDto, UpdateLienGroupeDto } from './lien_groupe.dto';
import { LienGroupeEntity } from './lien_groupe.entity';

@Injectable()
export class LienGroupeService {
  private static readonly MAX_BATCH = 500;

  constructor(
    @InjectRepository(LienGroupeEntity)
    private readonly repo: Repository<LienGroupeEntity>,
    @InjectRepository(GroupesEntity)
    private readonly groupesRepo: Repository<GroupesEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
    @InjectRepository(CoursEntity)
    private readonly coursRepo: Repository<CoursEntity>,
    @InjectRepository(SeanceEntity)
    private readonly seanceRepo: Repository<SeanceEntity>,
    private readonly access: AccessControlService,
  ) {}

  private async assertGroupeInProject(groupeId: number, projectId: number) {
    const groupe = await this.groupesRepo.findOne({ where: { id: groupeId } });
    if (!groupe) throw new NotFoundException(`groupe ${groupeId} introuvable`);
    await this.assertSaisonInProject(groupe.saison_id, projectId);
    return groupe;
  }

  private async assertSaisonInProject(saisonId: number, projectId: number) {
    const saison = await this.saisonRepo.findOne({ where: { id: saisonId } });
    if (!saison) throw new NotFoundException(`saison ${saisonId} introuvable`);
    if (Number(saison.project_id) !== Number(projectId)) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
    return saison;
  }

  private async assertCoursInProject(coursId: number, projectId: number) {
    const cours = await this.coursRepo.findOne({ where: { id: coursId } });
    if (!cours) throw new NotFoundException(`cours ${coursId} introuvable`);
    if (Number(cours.project_id) !== Number(projectId)) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
    return cours;
  }

  private async assertSeanceInProject(seanceId: number, projectId: number) {
    const seance = await this.seanceRepo.findOne({ where: { seance_id: seanceId } });
    if (!seance) throw new NotFoundException(`seance ${seanceId} introuvable`);
    await this.assertSaisonInProject(seance.saison_id, projectId);
    return seance;
  }

  async listForProject(projectId: number) {
    return this.repo
      .createQueryBuilder('l')
      .innerJoin('groupes', 'g', 'g.id = l.groupe_id')
      .innerJoin('saison', 's', 's.id = g.saison_id')
      .where('s.project_id = :projectId', { projectId })
      .orderBy('l.id', 'ASC')
      .getMany();
  }

  async listGroupesByCoursId(coursIds: number[], projectId: number) {
    const cleanIds = this.cleanIds(coursIds);
    for (const coursId of cleanIds) await this.assertCoursInProject(coursId, projectId);
    if (!cleanIds.length) return {};

    const liens = (await this.repo.find({
      where: { object_id: In(cleanIds), object_type: 'cours' },
    })).map((l) => ({ groupe_id: l.groupe_id, cours_id: l.object_id }));

    const result: Record<number, number[]> = {};
    for (const lien of liens) {
      await this.assertGroupeInProject(lien.groupe_id, projectId);
      result[lien.cours_id] = result[lien.cours_id] || [];
      result[lien.cours_id].push(lien.groupe_id);
    }
    return result;
  }

  async listGroupesBySeanceId(seanceIds: number[], projectId: number) {
    const cleanIds = this.cleanIds(seanceIds);
    for (const seanceId of cleanIds) await this.assertSeanceInProject(seanceId, projectId);
    if (!cleanIds.length) return {};

    const liens = (await this.repo.find({
      where: { object_id: In(cleanIds), object_type: 'séance' },
    })).map((l) => ({ groupe_id: l.groupe_id, seance_id: l.object_id }));

    const result: Record<number, number[]> = {};
    for (const lien of liens) {
      await this.assertGroupeInProject(lien.groupe_id, projectId);
      result[lien.seance_id] = result[lien.seance_id] || [];
      result[lien.seance_id].push(lien.groupe_id);
    }
    return result;
  }

  async listGroupesByPersonneId(
    personneIds: number[],
    projectId: number,
    requesterId: number,
  ) {
    const persons = await this.access.getPersonsSelfOrStaff(
      requesterId,
      personneIds,
      projectId,
    );
    const cleanIds = persons.map((person) => person.id);
    if (!cleanIds.length) return {};

    const liens = await this.repo.find({
      where: { object_id: In(cleanIds), object_type: 'rider' },
    });
    const result: Record<number, number[]> = {};

    for (const lien of liens) {
      try {
        await this.assertGroupeInProject(lien.groupe_id, projectId);
      } catch (error) {
        if (error instanceof ForbiddenException) continue;
        throw error;
      }
      result[lien.object_id] = result[lien.object_id] || [];
      result[lien.object_id].push(lien.groupe_id);
    }
    return result;
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`lien_groupe ${id} introuvable`);
    await this.assertGroupeInProject(item.groupe_id, projectId);
    return item;
  }

  async create(
    dto: CreateLienGroupeDto,
    projectId: number,
    requesterId: number,
  ) {
    await this.assertGroupeInProject(dto.groupe_id, projectId);
    await this.assertLinkedObjectInProject(
      dto.object_type,
      dto.object_id,
      projectId,
      requesterId,
    );
    return this.repo.save(this.repo.create(dto));
  }

  async update(
    id: number,
    dto: UpdateLienGroupeDto,
    projectId: number,
    requesterId: number,
  ) {
    const item = await this.getForProject(id, projectId);
    const nextGroupeId = dto.groupe_id ?? item.groupe_id;
    const nextObjectId = dto.object_id ?? item.object_id;
    const nextObjectType = dto.object_type ?? item.object_type;

    await this.assertGroupeInProject(nextGroupeId, projectId);
    await this.assertLinkedObjectInProject(
      nextObjectType,
      nextObjectId,
      projectId,
      requesterId,
    );

    Object.assign(item, dto, { date_maj: new Date() });
    return this.repo.save(item);
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }

  async removeIdFromGroupe(
    objectId: number,
    groupeId: number,
    type: string,
    projectId: number,
    requesterId: number,
  ) {
    await this.assertGroupeInProject(groupeId, projectId);
    await this.assertLinkedObjectInProject(type, objectId, projectId, requesterId);

    const item = await this.repo.findOne({
      where: { object_id: objectId, groupe_id: groupeId, object_type: type },
    });
    if (!item) {
      throw new NotFoundException(
        `lien_groupe introuvable pour object ${objectId} groupe ${groupeId} type ${type}`,
      );
    }
    await this.repo.remove(item);
    return { ok: true };
  }

  async updateGroupesForSeance(
    seanceId: number,
    groupeIds: number[],
    projectId: number,
  ) {
    await this.assertSeanceInProject(seanceId, projectId);
    for (const groupeId of this.cleanIds(groupeIds)) {
      await this.assertGroupeInProject(groupeId, projectId);
    }

    const existing = await this.repo.find({
      where: { object_id: seanceId, object_type: 'séance' },
    });
    for (const lien of existing) await this.assertGroupeInProject(lien.groupe_id, projectId);

    const cleanGroupeIds = this.cleanIds(groupeIds);
    const existingGroupeIds = existing.map((e) => e.groupe_id);
    const toDelete = existing.filter((e) => !cleanGroupeIds.includes(e.groupe_id));
    const toAdd = cleanGroupeIds.filter((gid) => !existingGroupeIds.includes(gid));

    if (toDelete.length) await this.repo.remove(toDelete);
    if (toAdd.length) {
      await this.repo.save(toAdd.map((gid) => this.repo.create({
        groupe_id: gid,
        object_id: seanceId,
        object_type: 'séance',
      })));
    }
    return { ok: true };
  }

  async updateGroupesForCours(
    coursId: number,
    groupeIds: number[],
    projectId: number,
  ) {
    await this.assertCoursInProject(coursId, projectId);
    for (const groupeId of this.cleanIds(groupeIds)) {
      await this.assertGroupeInProject(groupeId, projectId);
    }

    const existing = await this.repo.find({
      where: { object_id: coursId, object_type: 'cours' },
    });
    for (const lien of existing) await this.assertGroupeInProject(lien.groupe_id, projectId);

    const cleanGroupeIds = this.cleanIds(groupeIds);
    const existingGroupeIds = existing.map((e) => e.groupe_id);
    const toDelete = existing.filter((e) => !cleanGroupeIds.includes(e.groupe_id));
    const toAdd = cleanGroupeIds.filter((gid) => !existingGroupeIds.includes(gid));

    if (toDelete.length) await this.repo.remove(toDelete);
    if (toAdd.length) {
      await this.repo.save(toAdd.map((gid) => this.repo.create({
        groupe_id: gid,
        object_id: coursId,
        object_type: 'cours',
      })));
    }
    return { ok: true };
  }

  async lienGroupeByPersonne(
    personneId: number,
    saisonId: number,
    projectId: number,
    requesterId: number,
  ) {
    await this.assertSaisonInProject(saisonId, projectId);
    await this.access.getPersonSelfOrStaff(requesterId, personneId, projectId);

    const liens = await this.repo.find({
      where: { object_id: personneId, object_type: 'rider' },
    });
    const groupeIds = liens.map((l) => l.groupe_id);
    if (!groupeIds.length) return [];

    const groupes = await this.groupesRepo.findBy({
      id: In(groupeIds),
      saison_id: saisonId,
    });
    const allowedGroupIds = new Set(groupes.map((g) => Number(g.id)));
    return liens.filter((lien) => allowedGroupIds.has(Number(lien.groupe_id)));
  }

  private async assertLinkedObjectInProject(
    type: string,
    objectId: number,
    projectId: number,
    requesterId: number,
  ): Promise<void> {
    const normalizedType = String(type ?? '').trim().toLowerCase();
    if (normalizedType === 'rider' || normalizedType === 'personne' || normalizedType === 'person') {
      await this.access.getAuthorizedPerson(requesterId, objectId, projectId);
      return;
    }
    if (normalizedType === 'cours') {
      await this.assertCoursInProject(objectId, projectId);
      return;
    }
    if (normalizedType === 'séance' || normalizedType === 'seance') {
      await this.assertSeanceInProject(objectId, projectId);
      return;
    }
    throw new ForbiddenException('UNSUPPORTED_GROUP_LINK_TYPE');
  }

  private cleanIds(ids: number[]): number[] {
    const clean = [...new Set((ids ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0))];
    if (clean.length > LienGroupeService.MAX_BATCH) {
      throw new ForbiddenException('TOO_MANY_OBJECTS');
    }
    return clean;
  }
}

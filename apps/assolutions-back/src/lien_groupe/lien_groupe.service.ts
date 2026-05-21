import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { GroupesEntity } from '../groupes/groupes.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { CreateLienGroupeDto, UpdateLienGroupeDto } from './lien_groupe.dto';
import { LienGroupeEntity } from './lien_groupe.entity';

@Injectable()
export class LienGroupeService {
  constructor(
    @InjectRepository(LienGroupeEntity)
    private readonly repo: Repository<LienGroupeEntity>,
    @InjectRepository(GroupesEntity)
    private readonly groupesRepo: Repository<GroupesEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
    private readonly registry: RegistryService,
  ) {}

  private async assertGroupeInProject(groupeId: number, projectId: number) {
    const groupe = await this.groupesRepo.findOne({ where: { id: groupeId } });
    if (!groupe) throw new NotFoundException(`groupe ${groupeId} introuvable`);

    const saison = await this.saisonRepo.findOne({ where: { id: groupe.saison_id } });
    if (!saison) throw new NotFoundException(`saison ${groupe.saison_id} introuvable`);

    if (saison.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
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

  async listGroupesByCoursId(coursId: number[]) {
    const liens = (await this.repo.find({ where: { object_id: In(coursId), object_type: 'cours' } })).map(l => ({ groupe_id: l.groupe_id, cours_id: l.object_id }));
    return liens.reduce((acc, lien) => {
      acc[lien.cours_id] = acc[lien.cours_id] || [];
      acc[lien.cours_id].push(lien.groupe_id);
      return acc;
    }, {} as Record<number, number[]>);
  }
    async listGroupesBySeanceId(seanceId: number[]) {
    const liens = (await this.repo.find({ where: { object_id: In(seanceId), object_type: 'séance' } })).map(l => ({ groupe_id: l.groupe_id, seance_id: l.object_id }));
    return liens.reduce((acc, lien) => {
      acc[lien.seance_id] = acc[lien.seance_id] || [];
      acc[lien.seance_id].push(lien.groupe_id);
      return acc;
    }, {} as Record<number, number[]>);
  }
  async listGroupesByPersonneId(personneId:number[]){
    const liens = (await this.repo.find({ where: { object_id: In(personneId), object_type: 'rider' } })).map(l => ({ groupe_id: l.groupe_id, personne_id: l.object_id }));
    return liens.reduce((acc, lien) => {
      acc[lien.personne_id] = acc[lien.personne_id] || [];
      acc[lien.personne_id].push(lien.groupe_id);
      return acc;
    }, {} as Record<number, number[]>);
  }

  async getForProject(id: number, projectId: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`lien_groupe ${id} introuvable`);
    await this.assertGroupeInProject(item.groupe_id, projectId);
    return item;
  }

  async create(dto: CreateLienGroupeDto, projectId: number) {
    await this.assertGroupeInProject(dto.groupe_id, projectId);

    const entity = this.repo.create(dto as CreateLienGroupeDto);
    const saved = await this.repo.save(entity);

    await this.registry.ensure('lien_groupe', saved.id);
    return saved;
  }

  async update(id: number, dto: UpdateLienGroupeDto, projectId: number) {
    const item = await this.getForProject(id, projectId);

    Object.assign(item, dto, { date_maj: new Date() });
    const saved = await this.repo.save(item);

    await this.registry.ensure('lien_groupe', id);
    return saved;
  }

  async remove(id: number, projectId: number) {
    const item = await this.getForProject(id, projectId);
    await this.repo.remove(item);

    await this.registry.remove('lien_groupe', id);
    return { ok: true };
  }

  async removeidfromgroupe(objectId: number, groupeId: number, type: string) {
    const item = await this.repo.findOne({ where: { object_id: objectId, groupe_id: groupeId, object_type: type } });
    if (!item) throw new NotFoundException(`lien_groupe introuvable pour object ${objectId} groupe ${groupeId} type ${type}`);
    await this.repo.remove(item);
  }

  async updateGroupesForSeance(seanceId: number, groupeIds: number[], projectId: number) {
    // on vérifie que tous les groupes appartiennent bien au projet
    for (const groupeId of groupeIds) {
      await this.assertGroupeInProject(groupeId, projectId);
    }
    // on récupère les liens existants pour cette séance
    const existing = await this.repo.find({ where: { object_id: seanceId, object_type: 'séance' } });
    const existingGroupeIds = existing.map(e => e.groupe_id);
    // on calcule les liens à supprimer et à ajouter
    const toDelete = existing.filter(e => !groupeIds.includes(e.groupe_id));
    const toAdd = groupeIds.filter(gid => !existingGroupeIds.includes(gid));
    // on supprime les liens à supprimer
    await this.repo.remove(toDelete);
    // on ajoute les liens à ajouter
    const newLiens = toAdd.map(gid => this.repo.create({ groupe_id: gid, object_id: seanceId, object_type: 'séance' }));
    await this.repo.save(newLiens);
  }

  async updateGroupesForCours(coursId: number, groupeIds: number[]) {

    // on récupère les liens existants pour ce cours
    const existing = await this.repo.find({ where: { object_id: coursId, object_type: 'cours' } });
    const existingGroupeIds = existing.map(e => e.groupe_id);
    // on calcule les liens à supprimer et à ajouter
    const toDelete = existing.filter(e => !groupeIds.includes(e.groupe_id));
    const toAdd = groupeIds.filter(gid => !existingGroupeIds.includes(gid));
    // on supprime les liens à supprimer
    await this.repo.remove(toDelete);
    // on ajoute les liens à ajouter
    const newLiens = toAdd.map(gid => this.repo.create({ groupe_id: gid, object_id: coursId, object_type: 'cours' }));
    await this.repo.save(newLiens);
  }

  async lienGroupeByPersonne(personneId: number, saisonId: number) {
    const liens = await this.repo.find({ where: { object_id: personneId, object_type: 'rider' } });
    const groupeIds = liens.map(l => l.groupe_id);
    if (groupeIds.length === 0) return [];
    const groupes = await this.groupesRepo.findBy({ id: In(groupeIds), saison_id: saisonId });
    let retour: LienGroupeEntity[] = [];
   liens.forEach(lien => {
      const groupe = groupes.find(g => g.id === lien.groupe_id);
      if (!groupe) return; // le groupe n'est pas dans la saison demandée
      retour.push(lien);
    });
    return retour;
  }
  }

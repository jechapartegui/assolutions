import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaisonEntity } from '../saison/saison.entity';
import { SeanceEntity } from '../seance/seance.entity';
import { CreateInscriptionSeanceDto, UpdateInscriptionSeanceDto } from './inscription_seance.dto';
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
  ) {}

  private async assertSeanceInProject(seanceId: number, projectId: number) {
    const seance = await this.seanceRepo.findOne({ where: { seance_id: seanceId } });
    if (!seance) throw new NotFoundException(`seance ${seanceId} introuvable`);

    const saison = await this.saisonRepo.findOne({ where: { id: seance.saison_id } });
    if (!saison) throw new NotFoundException(`saison ${seance.saison_id} introuvable`);

    if (saison.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
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

  async getForProject(personneId: number, seanceId: number, projectId: number) {
    await this.assertSeanceInProject(seanceId, projectId);

    const item = await this.repo.findOne({ where: { personne_id: personneId, seance_id: seanceId } });
    if (!item) throw new NotFoundException(`inscription_seance introuvable`);
    return item;
  }

  async create(dto: CreateInscriptionSeanceDto, projectId: number) {
    await this.assertSeanceInProject(dto.seance_id, projectId);

    const entity = this.repo.create(dto as CreateInscriptionSeanceDto);
    return this.repo.save(entity);
  }

  async update(personneId: number, seanceId: number, dto: UpdateInscriptionSeanceDto, projectId: number) {
    const item = await this.getForProject(personneId, seanceId, projectId);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(personneId: number, seanceId: number, projectId: number) {
    const item = await this.getForProject(personneId, seanceId, projectId);
    await this.repo.remove(item);
    return { ok: true };
  }
}

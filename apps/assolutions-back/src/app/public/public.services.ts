import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CoursService } from '../cours/cours.services';
import { SeanceService } from '../seance/seance.services';
import { Project } from '../../entities/projet.entity';
import { Season } from '../../entities/saison.entity';

// ⚠️ adapte le chemin + le nom exact de l’entité

@Injectable()
export class PublicPlanningService {
  constructor(
    private readonly coursService: CoursService,
    private readonly seanceService: SeanceService,

    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  private async getActiveSaisonIdFromProject(projectId: number): Promise<Season> {
    const project = await this.projectRepo.findOne({
      where: { id: Number(projectId) },
      relations: ['seasons'], // si relation existe
    });

    if (!project) {
      throw new NotFoundException(`Projet introuvable (id=${projectId})`);
    }

    // Cas 1 : relation project.saison_active?.id
    const saisonIdActive =       (project as Project).seasons?.find((saison) => saison.isActive)?.id;
      // Cas 2 : colonne project.saison_active_id
       if (!saisonIdActive) {
      throw new NotFoundException(
        `Aucune saison active trouvée pour le projet (id=${projectId})`,
      );
    } else {
    return (project as Project).seasons?.find((saison) => saison.isActive);

    }

  }

  async getCoursByProject(projectId: number) {
    const saisonId = await this.getActiveSaisonIdFromProject(projectId);

    // Choisis ce que tu veux exposer :
    // - GetAll : complet
    // - GetAllLight : public-friendly
    return this.coursService.GetAll(saisonId.id);
    // return this.coursService.GetAll(saisonId);
  }

  async getSeancesByProject(projectId: number, from: string, to: string) {
    const saisonId = await this.getActiveSaisonIdFromProject(projectId);

    if (!from ){
        from = saisonId.startDate.toISOString().split('T')[0];     
    }
    if (!to ){
        to = saisonId.endDate.toISOString().split('T')[0];     
    }

    // tu as déjà: seance_serv.GetByDate(saison_id, date_debut, date_fin)
    return this.seanceService.GetByDate(saisonId.id, from, to, true);
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { PersonneEntity } from '../personne/personne.entity';
import { SouscriptionEntity } from '../souscription/souscription.entity';
import { SouscriptionPersonneEntity } from '../souscription/souscription-personne.entity';
import { PreuveMedicaleService } from './preuve-medicale.service';

@Injectable()
export class SouscriptionMedicalGuardService {
  constructor(
    @InjectRepository(SouscriptionEntity)
    private readonly souscriptionRepo: Repository<SouscriptionEntity>,
    @InjectRepository(SouscriptionPersonneEntity)
    private readonly ligneRepo: Repository<SouscriptionPersonneEntity>,
    @InjectRepository(PersonneEntity)
    private readonly personneRepo: Repository<PersonneEntity>,
    private readonly preuvesMedicales: PreuveMedicaleService,
  ) {}

  async assertComplete(
    souscriptionId: number,
    projectId: number,
    compteId: number,
  ): Promise<void> {
    const souscription = await this.souscriptionRepo.findOne({
      where: { id: souscriptionId },
    });
    if (!souscription) {
      throw new NotFoundException('Souscription introuvable');
    }
    if (
      Number(souscription.project_id) !== Number(projectId) ||
      Number(souscription.compte_id) !== Number(compteId)
    ) {
      throw new ForbiddenException('SOUSCRIPTION_HORS_COMPTE_OU_PROJET');
    }

    const lignes = await this.ligneRepo.find({
      where: { souscription_id: souscription.id },
      order: { id: 'ASC' },
    });
    if (!lignes.length) {
      throw new BadRequestException('La souscription ne contient aucune personne');
    }

    const personnes = await this.personneRepo.find({
      where: { id: In(lignes.map((ligne) => ligne.personne_id)) },
    });
    const personnesById = new Map(
      personnes.map((personne) => [personne.id, personne]),
    );
    const erreurs: string[] = [];

    for (const ligne of lignes) {
      const personne = personnesById.get(ligne.personne_id);
      const evaluation = await this.preuvesMedicales.evaluate(
        {
          personne_id: ligne.personne_id,
          saison_id: souscription.saison_id,
          type_licence: ligne.type_licence ?? 'LOISIR',
        },
        projectId,
        compteId,
      );

      if (!evaluation.eligible) {
        const nom = personne
          ? `${personne.first_name} ${personne.last_name}`.trim()
          : `Personne #${ligne.personne_id}`;
        erreurs.push(`${nom} : ${evaluation.message}`);
      }
    }

    if (erreurs.length) {
      throw new BadRequestException(
        `Situation médicale obligatoire : ${erreurs.join(' · ')}`,
      );
    }
  }
}

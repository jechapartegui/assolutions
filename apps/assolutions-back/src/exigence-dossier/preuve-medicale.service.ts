import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { PersonneEntity } from '../personne/personne.entity';
import { ProfesseurEntity } from '../professeur/professeur.entity';
import { ProjectEntity } from '../project/project.entity';
import { SaisonEntity } from '../saison/saison.entity';
import {
  EvaluerPreuveMedicaleDto,
  SavePreuveMedicaleDto,
} from './preuve-medicale.dto';
import { PreuveMedicaleEntity } from './preuve-medicale.entity';

@Injectable()
export class PreuveMedicaleService {
  constructor(
    @InjectRepository(PreuveMedicaleEntity)
    private readonly repo: Repository<PreuveMedicaleEntity>,
    @InjectRepository(PersonneEntity)
    private readonly personneRepo: Repository<PersonneEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async list(
    personneId: number,
    saisonId: number,
    projectId: number,
    compteId: number,
  ) {
    await this.assertSeason(saisonId, projectId);
    await this.getAuthorizedPerson(personneId, compteId, projectId);
    const proofs = await this.repo.find({
      where: { project_id: projectId, personne_id: personneId },
      order: { date_document: 'DESC', id: 'DESC' },
    });

    // Compatibilité avec les données créées avant l'unicité logique :
    // dans l'affichage, un seul certificat et un seul QS Sport sont actifs.
    const activeTypes = new Set<string>();
    return proofs.map((proof) => {
      if (!proof.valide) return proof;
      if (activeTypes.has(proof.type_preuve)) {
        return { ...proof, valide: false };
      }
      activeTypes.add(proof.type_preuve);
      return proof;
    });
  }

  async save(
    dto: SavePreuveMedicaleDto,
    projectId: number,
    compteId: number,
  ) {
    await this.assertSeason(dto.saison_id, projectId);
    await this.getAuthorizedPerson(dto.personne_id, compteId, projectId);
    this.validate(dto);

    return this.dataSource.transaction(async (manager) => {
      const proofRepo = manager.getRepository(PreuveMedicaleEntity);
      const now = new Date();

      // Une personne ne doit avoir qu'un justificatif actif de chaque type.
      // Le précédent reste en historique mais ne participe plus à l'évaluation.
      await proofRepo
        .createQueryBuilder()
        .update(PreuveMedicaleEntity)
        .set({ valide: false, updated_at: now })
        .where('project_id = :projectId', { projectId })
        .andWhere('personne_id = :personneId', {
          personneId: dto.personne_id,
        })
        .andWhere('type_preuve = :typePreuve', { typePreuve: dto.type_preuve })
        .andWhere('valide = true')
        .execute();

      return proofRepo.save(
        proofRepo.create({
          project_id: projectId,
          personne_id: dto.personne_id,
          saison_id: dto.saison_id,
          type_preuve: dto.type_preuve,
          date_document: dto.date_document.slice(0, 10),
          qs_reponses_negatives:
            dto.type_preuve === 'QS_SPORT'
              ? dto.qs_reponses_negatives ?? null
              : null,
          // Dans le nouveau modèle métier, tout certificat médical peut servir
          // de preuve compétition dès lors que son parcours de validité est OK.
          valable_competition: dto.type_preuve === 'CERTIFICAT',
          medecin_nom:
            dto.type_preuve === 'CERTIFICAT'
              ? this.text(dto.medecin_nom)
              : null,
          medecin_rpps:
            dto.type_preuve === 'CERTIFICAT'
              ? this.text(dto.medecin_rpps)
              : null,
          document_id: dto.document_id ?? null,
          valide: true,
          commentaire: this.text(dto.commentaire),
          updated_at: now,
        }),
      );
    });
  }

  async evaluate(
    dto: EvaluerPreuveMedicaleDto,
    projectId: number,
    compteId: number,
  ) {
    const saison = await this.assertSeason(dto.saison_id, projectId);
    const personne = await this.getAuthorizedPerson(
      dto.personne_id,
      compteId,
      projectId,
    );
    const proofs = await this.repo.find({
      where: {
        project_id: projectId,
        personne_id: personne.id,
        valide: true,
      },
      order: { date_document: 'DESC', id: 'DESC' },
    });

    // Même si d'anciens tests ont laissé plusieurs lignes valide=true,
    // seule la plus récente de chaque type est considérée active.
    const activeQs = proofs.find((item) => item.type_preuve === 'QS_SPORT');
    const activeCertificate = proofs.find(
      (item) => item.type_preuve === 'CERTIFICAT',
    );

    // La validité du certificat s'apprécie au jour où le dossier est évalué
    // (donc au jour de l'inscription), et non au premier jour de la saison.
    const today = new Date().toISOString().slice(0, 10);
    const currentSeasonQs =
      activeQs && activeQs.saison_id === saison.id ? activeQs : undefined;
    const negativeCurrentSeasonQs =
      currentSeasonQs?.qs_reponses_negatives === true
        ? currentSeasonQs
        : undefined;

    const recentCertificate =
      activeCertificate &&
      this.isWithinMonths(activeCertificate.date_document, today, 12)
        ? activeCertificate
        : undefined;
    const referenceCertificate =
      activeCertificate &&
      this.isWithinMonths(activeCertificate.date_document, today, 36)
        ? activeCertificate
        : undefined;

    // Dossier médical général : trois parcours sont valides.
    // 1. certificat médical récent ;
    // 2. certificat de référence de moins de 3 ans + QS Sport annuel négatif ;
    // 3. QS Sport annuel négatif seul.
    let dossierEligible = false;
    let dossierStatut = 'SITUATION_MEDICALE_MANQUANTE';
    let dossierMessage =
      'Renseigne le questionnaire de santé de la saison ou un certificat médical';

    if (recentCertificate) {
      dossierEligible = true;
      dossierStatut = 'CERTIFICAT_VALIDE';
      dossierMessage = 'Certificat médical récent enregistré';
    } else if (referenceCertificate && negativeCurrentSeasonQs) {
      dossierEligible = true;
      dossierStatut = 'CERTIFICAT_REFERENCE_ET_QS';
      dossierMessage =
        'Certificat de moins de 3 ans et questionnaire de santé annuel validés';
    } else if (negativeCurrentSeasonQs) {
      dossierEligible = true;
      dossierStatut = 'QS_VALIDE';
      dossierMessage = 'Questionnaire de santé de la saison validé';
    } else if (
      currentSeasonQs &&
      currentSeasonQs.qs_reponses_negatives === false
    ) {
      dossierStatut = 'QS_POSITIF_CERTIFICAT_REQUIS';
      dossierMessage =
        'Le questionnaire comporte une réponse positive : ajoute un certificat médical récent';
    } else if (referenceCertificate) {
      dossierStatut = 'QS_MANQUANT';
      dossierMessage =
        'Le certificat a moins de 3 ans : complète le questionnaire de santé de la saison';
    }

    // Pour la compétition, un certificat doit faire partie d'un parcours valide.
    // Un certificat récent suffit ; un certificat plus ancien (moins de 3 ans)
    // doit être complété par le QS Sport de la saison. Un QS seul ne suffit pas.
    let competitionCompatible = false;
    let competitionStatut = 'CERTIFICAT_COMPETITION_MANQUANT';
    let competitionMessage =
      'Un certificat médical est requis pour la pratique en compétition';

    if (recentCertificate) {
      competitionCompatible = true;
      competitionStatut = 'CERTIFICAT_COMPETITION_VALIDE';
      competitionMessage = 'Certificat médical récent valide pour la compétition';
    } else if (referenceCertificate && negativeCurrentSeasonQs) {
      competitionCompatible = true;
      competitionStatut = 'CERTIFICAT_COMPETITION_REFERENCE_ET_QS';
      competitionMessage =
        'Certificat de moins de 3 ans et questionnaire de santé annuel validés pour la compétition';
    } else if (referenceCertificate) {
      competitionStatut = 'QS_COMPETITION_MANQUANT';
      competitionMessage =
        'Le certificat a moins de 3 ans : complète le questionnaire de santé de la saison';
    } else if (negativeCurrentSeasonQs) {
      competitionStatut = 'CERTIFICAT_COMPETITION_MANQUANT';
      competitionMessage =
        'Le questionnaire de santé est valide, mais un certificat médical manque pour la compétition';
    }

    const competitionContext = dto.type_licence === 'COMPETITION';
    return {
      eligible: competitionContext ? competitionCompatible : dossierEligible,
      statut: competitionContext ? competitionStatut : dossierStatut,
      message: competitionContext ? competitionMessage : dossierMessage,
      dossier_eligible: dossierEligible,
      compatible_competition: competitionCompatible,
      message_dossier: dossierMessage,
      message_competition: competitionMessage,
      certificat: activeCertificate ?? null,
      qs_sport: currentSeasonQs ?? null,
    };
  }

  private validate(dto: SavePreuveMedicaleDto) {
    if (!dto.date_document) {
      throw new BadRequestException('La date du justificatif est obligatoire');
    }
    if (dto.type_preuve === 'CERTIFICAT') {
      if (!this.text(dto.medecin_nom)) {
        throw new BadRequestException('Le nom du médecin est obligatoire');
      }
      if (!this.text(dto.medecin_rpps)) {
        throw new BadRequestException('Le numéro RPPS est obligatoire');
      }
    }
    if (
      dto.type_preuve === 'QS_SPORT' &&
      typeof dto.qs_reponses_negatives !== 'boolean'
    ) {
      throw new BadRequestException(
        'Le résultat du questionnaire de santé est obligatoire',
      );
    }
  }

  private async assertSeason(id: number, projectId: number) {
    const season = await this.saisonRepo.findOne({ where: { id } });
    if (!season) throw new NotFoundException('Saison introuvable');
    if (season.project_id !== projectId) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
    return season;
  }

  private async getAuthorizedPerson(
    id: number,
    compteId: number,
    projectId: number,
  ) {
    const personne = await this.personneRepo.findOne({ where: { id } });
    if (!personne) throw new NotFoundException('Personne introuvable');

    // Une personne peut toujours gérer sa propre preuve médicale.
    if (Number(personne.compte) === Number(compteId)) return personne;

    const project = await this.dataSource
      .getRepository(ProjectEntity)
      .findOne({ where: { id: projectId } as any });
    const ownerId = Number(
      (project as any)?.compte_id ??
        (project as any)?.compteId ??
        (project as any)?.compte?.id ??
        (project as any)?.compte ??
        0,
    );

    // L'administrateur/propriétaire du projet peut gérer tous les adhérents.
    if (ownerId === Number(compteId)) return personne;

    // Un professeur du projet doit également pouvoir gérer les preuves
    // médicales des adhérents. professeur.id = personne.id : on retrouve donc
    // un professeur connecté via le compte porté par sa fiche personne.
    const professorCount = await this.dataSource
      .getRepository(ProfesseurEntity)
      .createQueryBuilder('professeur')
      .innerJoin(PersonneEntity, 'personne_prof', 'personne_prof.id = professeur.id')
      .where('professeur.project_id = :projectId', { projectId })
      .andWhere('personne_prof.compte = :compteId', { compteId })
      .getCount();

    if (professorCount <= 0) {
      throw new ForbiddenException('PERSONNE_HORS_COMPTE');
    }

    return personne;
  }

  private isWithinMonths(
    dateDocument: string,
    referenceDate: string,
    months: number,
  ) {
    const documentDate = new Date(`${dateDocument}T00:00:00`);
    const reference = new Date(`${referenceDate}T00:00:00`);
    const expiry = new Date(documentDate);
    expiry.setMonth(expiry.getMonth() + months);
    return documentDate <= reference && expiry >= reference;
  }

  private text(value: string | null | undefined) {
    const result = (value ?? '').trim();
    return result || null;
  }
}

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
          // La compatibilité compétition dépend désormais du parcours médical
          // lié à l'âge, pas de la seule présence d'un certificat.
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

    const age = this.civilAge(personne.date_naissance, saison.date_debut);
    const isMinor = age < 18;

    // La validité s'apprécie au jour de l'évaluation du dossier.
    const today = new Date().toISOString().slice(0, 10);
    const currentSeasonQs =
      activeQs && activeQs.saison_id === saison.id ? activeQs : undefined;
    const negativeCurrentSeasonQs =
      currentSeasonQs?.qs_reponses_negatives === true
        ? currentSeasonQs
        : undefined;
    const positiveCurrentSeasonQs =
      currentSeasonQs?.qs_reponses_negatives === false
        ? currentSeasonQs
        : undefined;

    const recentCertificate =
      activeCertificate &&
      this.isWithinMonths(activeCertificate.date_document, today, 12)
        ? activeCertificate
        : undefined;
    const olderCertificate =
      activeCertificate && !recentCertificate ? activeCertificate : undefined;

    let dossierEligible = false;
    let dossierStatut = 'SITUATION_MEDICALE_MANQUANTE';
    let dossierMessage = 'Situation médicale à renseigner';

    if (isMinor) {
      // Mineur, loisir comme compétition : le QS Sport de la saison est la
      // règle normale. Le certificat n'est demandé que si le questionnaire
      // comporte une réponse positive.
      if (negativeCurrentSeasonQs) {
        dossierEligible = true;
        dossierStatut = 'QS_JEUNE_VALIDE';
        dossierMessage =
          'Questionnaire de santé de la saison validé : aucun certificat médical n’est requis pour un mineur';
      } else if (positiveCurrentSeasonQs && recentCertificate) {
        dossierEligible = true;
        dossierStatut = 'QS_JEUNE_POSITIF_CERTIFICAT_VALIDE';
        dossierMessage =
          'Questionnaire de santé avec réponse positive et certificat médical récent enregistrés';
      } else if (positiveCurrentSeasonQs) {
        dossierStatut = 'QS_JEUNE_POSITIF_CERTIFICAT_REQUIS';
        dossierMessage =
          'Le questionnaire comporte une réponse positive : un certificat médical de moins d’un an est requis';
      } else {
        dossierStatut = 'QS_JEUNE_MANQUANT';
        dossierMessage =
          'Pour un mineur, le questionnaire de santé de la saison est requis, en loisir comme en compétition';
      }
    } else {
      // Adulte : un certificat médical est obligatoire. S'il a moins d'un an,
      // il suffit. Au-delà d'un an, il doit être complété par le QS Sport de
      // la saison. Il n'y a plus de seuil artificiel à trois ans.
      if (recentCertificate) {
        dossierEligible = true;
        dossierStatut = 'CERTIFICAT_ADULTE_VALIDE';
        dossierMessage = 'Certificat médical de moins d’un an enregistré';
      } else if (olderCertificate && negativeCurrentSeasonQs) {
        dossierEligible = true;
        dossierStatut = 'CERTIFICAT_ADULTE_ET_QS_VALIDE';
        dossierMessage =
          'Certificat médical de plus d’un an complété par le questionnaire de santé de la saison';
      } else if (positiveCurrentSeasonQs) {
        dossierStatut = 'QS_ADULTE_POSITIF_CERTIFICAT_RECENT_REQUIS';
        dossierMessage =
          'Le questionnaire comporte une réponse positive : ajoute un certificat médical de moins d’un an';
      } else if (olderCertificate) {
        dossierStatut = 'QS_ADULTE_MANQUANT';
        dossierMessage =
          'Le certificat médical a plus d’un an : complète le questionnaire de santé de la saison';
      } else {
        dossierStatut = 'CERTIFICAT_ADULTE_MANQUANT';
        dossierMessage = 'Un certificat médical est requis pour les adultes';
      }
    }

    // Loisir et compétition utilisent désormais la même règle médicale liée à
    // l'âge. Une licence compétition ne force donc jamais, à elle seule, un
    // certificat chez un mineur.
    const competitionCompatible = dossierEligible;
    const competitionStatut = dossierStatut;
    const competitionMessage = isMinor
      ? dossierEligible
        ? 'Situation médicale valide pour une licence compétition jeune'
        : dossierMessage
      : dossierEligible
        ? 'Situation médicale adulte valide pour la compétition'
        : dossierMessage;

    const competitionContext = dto.type_licence === 'COMPETITION';
    return {
      eligible: competitionContext ? competitionCompatible : dossierEligible,
      statut: competitionContext ? competitionStatut : dossierStatut,
      message: competitionContext ? competitionMessage : dossierMessage,
      dossier_eligible: dossierEligible,
      compatible_competition: competitionCompatible,
      message_dossier: dossierMessage,
      message_competition: competitionMessage,
      age,
      mineur: isMinor,
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

  private civilAge(birthDate: string, referenceDate: string) {
    const birth = new Date(`${birthDate}T00:00:00`);
    const reference = new Date(`${referenceDate}T00:00:00`);
    let age = reference.getFullYear() - birth.getFullYear();
    const beforeBirthday =
      reference.getMonth() < birth.getMonth() ||
      (reference.getMonth() === birth.getMonth() &&
        reference.getDate() < birth.getDate());
    if (beforeBirthday) age -= 1;
    return age;
  }

  private text(value: string | null | undefined) {
    const result = (value ?? '').trim();
    return result || null;
  }
}

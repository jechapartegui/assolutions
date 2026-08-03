import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { PersonneEntity } from '../personne/personne.entity';
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
    return this.repo.find({
      where: { project_id: projectId, personne_id: personneId },
      order: { date_document: 'DESC', id: 'DESC' },
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

    return this.repo.save(
      this.repo.create({
        project_id: projectId,
        personne_id: dto.personne_id,
        saison_id: dto.saison_id,
        type_preuve: dto.type_preuve,
        date_document: dto.date_document.slice(0, 10),
        qs_reponses_negatives:
          dto.type_preuve === 'QS_SPORT'
            ? dto.qs_reponses_negatives ?? null
            : null,
        valable_competition: !!dto.valable_competition,
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
        updated_at: new Date(),
      }),
    );
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

    const age = this.civilAge(personne.date_naissance, saison.date_debut);
    const currentSeasonQs = proofs.find(
      (item) =>
        item.type_preuve === 'QS_SPORT' &&
        item.saison_id === saison.id &&
        item.qs_reponses_negatives === true,
    );
    const certificates = proofs.filter(
      (item) => item.type_preuve === 'CERTIFICAT',
    );
    const recentCertificate = certificates.find((item) =>
      this.isWithinMonths(item.date_document, saison.date_debut, 12),
    );
    const competitionCertificates = certificates.filter(
      (item) => item.valable_competition,
    );
    const recentCompetitionCertificate = competitionCertificates.find((item) =>
      this.isWithinMonths(item.date_document, saison.date_debut, 12),
    );
    const referenceCompetitionCertificate = competitionCertificates.find((item) =>
      this.isWithinMonths(item.date_document, saison.date_debut, 36),
    );

    if (dto.type_licence === 'LOISIR') {
      if (currentSeasonQs) {
        return {
          eligible: true,
          statut: 'QS_VALIDE',
          message: 'Questionnaire de santé de la saison validé',
          certificat: recentCertificate ?? null,
          qs_sport: currentSeasonQs,
        };
      }
      if (recentCertificate) {
        return {
          eligible: true,
          statut: 'CERTIFICAT_VALIDE',
          message: 'Certificat médical récent enregistré',
          certificat: recentCertificate,
          qs_sport: null,
        };
      }
      return {
        eligible: false,
        statut: 'SITUATION_MEDICALE_MANQUANTE',
        message:
          'Renseigne le questionnaire de santé de la saison ou un certificat médical récent',
        certificat: null,
        qs_sport: null,
      };
    }

    if (age < 18) {
      if (currentSeasonQs) {
        return {
          eligible: true,
          statut: 'QS_VALIDE',
          message: 'Questionnaire de santé de la saison validé',
          certificat: referenceCompetitionCertificate ?? null,
          qs_sport: currentSeasonQs,
        };
      }
      if (recentCompetitionCertificate) {
        return {
          eligible: true,
          statut: 'CERTIFICAT_VALIDE',
          message: 'Certificat médical récent valide pour la compétition',
          certificat: recentCompetitionCertificate,
          qs_sport: null,
        };
      }
      return {
        eligible: false,
        statut: 'PREUVE_MANQUANTE',
        message:
          'Questionnaire de santé négatif requis ; en cas de réponse positive, fournir un certificat médical récent',
        certificat: referenceCompetitionCertificate ?? null,
        qs_sport: null,
      };
    }

    if (recentCompetitionCertificate) {
      return {
        eligible: true,
        statut: 'CERTIFICAT_VALIDE',
        message: 'Certificat médical récent valide pour la compétition',
        certificat: recentCompetitionCertificate,
        qs_sport: currentSeasonQs ?? null,
      };
    }
    if (referenceCompetitionCertificate && currentSeasonQs) {
      return {
        eligible: true,
        statut: 'CERTIFICAT_REFERENCE_ET_QS',
        message:
          'Certificat de référence encore utilisable et questionnaire de santé annuel validé',
        certificat: referenceCompetitionCertificate,
        qs_sport: currentSeasonQs,
      };
    }
    if (referenceCompetitionCertificate) {
      return {
        eligible: false,
        statut: 'QS_MANQUANT',
        message:
          'Le certificat de référence est encore utilisable, mais le questionnaire de santé annuel manque',
        certificat: referenceCompetitionCertificate,
        qs_sport: null,
      };
    }
    return {
      eligible: false,
      statut: 'CERTIFICAT_MANQUANT',
      message:
        'Un certificat médical de moins d’un an mentionnant la pratique en compétition est requis',
      certificat: null,
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

    if (personne.compte === compteId) return personne;

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

    if (ownerId !== compteId) {
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
    if (
      reference.getMonth() < birth.getMonth() ||
      (reference.getMonth() === birth.getMonth() &&
        reference.getDate() < birth.getDate())
    ) {
      age -= 1;
    }
    return age;
  }

  private text(value: string | null | undefined) {
    const result = (value ?? '').trim();
    return result || null;
  }
}

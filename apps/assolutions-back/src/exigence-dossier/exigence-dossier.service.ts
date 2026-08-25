import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';

import { Contact } from '../contact/contact.entity';
import { DocumentEntity } from '../document/document.entity';
import { GroupesEntity } from '../groupes/groupes.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { TarifInscriptionEntity } from '../tarif_inscription/tarif_inscription.entity';
import {
  EvaluerDossierPersonneDto,
  SauverReponseExigenceDto,
} from './dossier-personne.dto';
import {
  SaveExigenceDossierDto,
  UpdateExigenceDossierDto,
} from './exigence-dossier.dto';
import { ExigenceDossierEntity } from './exigence-dossier.entity';
import { ExigenceDossierPorteeEntity } from './exigence-dossier-portee.entity';
import { PreuveMedicaleService } from './preuve-medicale.service';
import { ReponseExigenceDossierEntity } from './reponse-exigence-dossier.entity';

type RequirementWithScopes = ExigenceDossierEntity & {
  portees: ExigenceDossierPorteeEntity[];
};

type EffectiveRequirement = RequirementWithScopes & {
  licence_scope_match: boolean;
};

@Injectable()
export class ExigenceDossierService {
  constructor(
    @InjectRepository(ExigenceDossierEntity)
    private readonly exigenceRepo: Repository<ExigenceDossierEntity>,
    @InjectRepository(ExigenceDossierPorteeEntity)
    private readonly porteeRepo: Repository<ExigenceDossierPorteeEntity>,
    @InjectRepository(ReponseExigenceDossierEntity)
    private readonly reponseRepo: Repository<ReponseExigenceDossierEntity>,
    @InjectRepository(PersonneEntity)
    private readonly personneRepo: Repository<PersonneEntity>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
    @InjectRepository(GroupesEntity)
    private readonly groupeRepo: Repository<GroupesEntity>,
    @InjectRepository(TarifInscriptionEntity)
    private readonly tarifRepo: Repository<TarifInscriptionEntity>,
    private readonly preuveMedicaleService: PreuveMedicaleService,
    private readonly dataSource: DataSource,
  ) {}

  async list(projectId: number, saisonId?: number | null) {
    if (saisonId) await this.assertSeason(saisonId, projectId);
    const exigences = await this.exigenceRepo.find({
      where: saisonId
        ? [
            { project_id: projectId, saison_id: saisonId },
            { project_id: projectId, saison_id: IsNull() },
          ]
        : { project_id: projectId },
      order: { usage: 'ASC', ordre: 'ASC', libelle: 'ASC' },
    });
    return this.withScopes(exigences);
  }

  async create(dto: SaveExigenceDossierDto, projectId: number) {
    await this.validateDto(dto, projectId);
    const code = dto.code.trim().toUpperCase();
    await this.assertUnique(code, dto.saison_id ?? null, projectId);

    const id = await this.dataSource.transaction(async (manager) => {
      const exigenceRepo = manager.getRepository(ExigenceDossierEntity);
      const porteeRepo = manager.getRepository(ExigenceDossierPorteeEntity);
      const saved = await exigenceRepo.save(
        exigenceRepo.create({
          project_id: projectId,
          saison_id: dto.saison_id ?? null,
          code,
          libelle: dto.libelle.trim(),
          description: this.text(dto.description),
          usage: dto.usage,
          type_exigence: dto.type_exigence,
          source_code: this.text(dto.source_code)?.toUpperCase() ?? null,
          type_reponse: dto.type_reponse,
          obligatoire: dto.obligatoire,
          bloquante: dto.bloquante,
          age_min: dto.age_min ?? null,
          age_max: dto.age_max ?? null,
          validite_mois: dto.validite_mois ?? null,
          texte_consentement: this.text(dto.texte_consentement),
          version_texte: this.text(dto.version_texte),
          ordre: dto.ordre,
          actif: dto.actif,
          updated_at: new Date(),
        }),
      );
      await porteeRepo.save(
        dto.portees.map((portee) =>
          porteeRepo.create({
            exigence_id: saved.id,
            type_portee: portee.type_portee,
            cible_id: portee.cible_id ?? null,
            cible_code: this.text(portee.cible_code)?.toUpperCase() ?? null,
            obligatoire_override: portee.obligatoire_override ?? null,
            bloquante_override: portee.bloquante_override ?? null,
          }),
        ),
      );
      return saved.id;
    });
    return this.get(id, projectId);
  }

  async update(id: number, dto: UpdateExigenceDossierDto, projectId: number) {
    const entity = await this.getEntity(id, projectId);
    await this.validateDto(dto, projectId);
    const code = dto.code.trim().toUpperCase();
    await this.assertUnique(code, dto.saison_id ?? null, projectId, id);

    await this.dataSource.transaction(async (manager) => {
      const exigenceRepo = manager.getRepository(ExigenceDossierEntity);
      const porteeRepo = manager.getRepository(ExigenceDossierPorteeEntity);
      Object.assign(entity, {
        saison_id: dto.saison_id ?? null,
        code,
        libelle: dto.libelle.trim(),
        description: this.text(dto.description),
        usage: dto.usage,
        type_exigence: dto.type_exigence,
        source_code: this.text(dto.source_code)?.toUpperCase() ?? null,
        type_reponse: dto.type_reponse,
        obligatoire: dto.obligatoire,
        bloquante: dto.bloquante,
        age_min: dto.age_min ?? null,
        age_max: dto.age_max ?? null,
        validite_mois: dto.validite_mois ?? null,
        texte_consentement: this.text(dto.texte_consentement),
        version_texte: this.text(dto.version_texte),
        ordre: dto.ordre,
        actif: dto.actif,
        updated_at: new Date(),
      });
      await exigenceRepo.save(entity);
      await porteeRepo.delete({ exigence_id: id });
      await porteeRepo.save(
        dto.portees.map((portee) =>
          porteeRepo.create({
            exigence_id: id,
            type_portee: portee.type_portee,
            cible_id: portee.cible_id ?? null,
            cible_code: this.text(portee.cible_code)?.toUpperCase() ?? null,
            obligatoire_override: portee.obligatoire_override ?? null,
            bloquante_override: portee.bloquante_override ?? null,
          }),
        ),
      );
    });
    return this.get(id, projectId);
  }

  async remove(id: number, projectId: number) {
    const entity = await this.getEntity(id, projectId);
    await this.exigenceRepo.remove(entity);
    return { ok: true };
  }

  async evaluate(
    dto: EvaluerDossierPersonneDto,
    projectId: number,
    compteId: number,
  ) {
    const saison = await this.assertSeason(dto.saison_id, projectId);
    const personne = await this.getOwnedPerson(dto.personne_id, compteId);
    await this.assertContextTargets(dto, saison.id);

    const allRequirements = (await this.list(
      projectId,
      saison.id,
    )) as RequirementWithScopes[];
    const civilAge = this.civilAge(personne.date_naissance, saison.date_debut);
    const requirements = allRequirements
      .filter((item) => item.actif && this.matchesAge(item, civilAge))
      .map((item): EffectiveRequirement | null => {
        const matchingScopes = this.matchingScopes(item.portees, dto);
        if (!matchingScopes.length) return null;
        return {
          ...item,
          obligatoire: this.effectiveFlag(
            matchingScopes,
            'obligatoire_override',
            item.obligatoire,
          ),
          bloquante: this.effectiveFlag(
            matchingScopes,
            'bloquante_override',
            item.bloquante,
          ),
          licence_scope_match: matchingScopes.some(
            (scope) => scope.type_portee === 'TYPE_LICENCE',
          ),
        };
      })
      .filter((item): item is EffectiveRequirement => item !== null);

    const hasMedicalRequirement = requirements.some(
      (item) => item.type_exigence === 'PREUVE_MEDICALE',
    );
    const requiresCompetitionMedical = requirements.some(
      (item) =>
        item.type_exigence === 'PREUVE_MEDICALE' &&
        this.medicalRequirementRequiresCompetition(item, dto),
    );

    const [contacts, documents, responses, medical] = await Promise.all([
      this.contactRepo.find({
        where: { object_type: 'rider', object_id: personne.id },
      }),
      this.documentRepo.find({
        where: { objet_type: 'rider', objet_id: personne.id },
        order: { date_import: 'DESC' },
      }),
      requirements.length
        ? this.reponseRepo.find({
            where: {
              personne_id: personne.id,
              saison_id: saison.id,
              exigence_id: In(requirements.map((item) => item.id)),
            },
          })
        : Promise.resolve([]),
      hasMedicalRequirement
        ? this.preuveMedicaleService.evaluate(
            {
              personne_id: personne.id,
              saison_id: saison.id,
              type_licence: requiresCompetitionMedical
                ? 'COMPETITION'
                : 'LOISIR',
            },
            projectId,
            compteId,
          )
        : Promise.resolve(null),
    ]);
    const responseByRequirement = new Map(
      responses.map((item) => [item.exigence_id, item]),
    );

    const evaluations = requirements.map((requirement) => {
      const response = responseByRequirement.get(requirement.id) ?? null;
      const competitionMedical =
        requirement.type_exigence === 'PREUVE_MEDICALE' &&
        this.medicalRequirementRequiresCompetition(requirement, dto);
      const medicalSatisfied = competitionMedical
        ? medical?.compatible_competition === true
        : medical?.dossier_eligible === true;
      const evaluation =
        requirement.type_exigence === 'PREUVE_MEDICALE'
          ? {
              satisfied: medicalSatisfied,
              answered: !!(medical?.certificat || medical?.qs_sport),
              reason: medicalSatisfied
                ? null
                : competitionMedical
                  ? medical?.message_competition ??
                    'Certificat compatible compétition à renseigner'
                  : medical?.message_dossier ??
                    'Situation médicale à renseigner',
              documentId:
                medical?.certificat?.document_id ??
                medical?.qs_sport?.document_id ??
                null,
            }
          : this.evaluateRequirement(
              requirement,
              personne,
              contacts,
              documents,
              response,
            );
      return {
        id: requirement.id,
        code: requirement.code,
        libelle: requirement.libelle,
        description: requirement.description,
        usage: requirement.usage,
        type_exigence: requirement.type_exigence,
        source_code: requirement.source_code,
        type_reponse: requirement.type_reponse,
        obligatoire: requirement.obligatoire,
        bloquante: requirement.bloquante,
        concerne_licence:
          requirement.usage === 'LICENCE' || requirement.licence_scope_match,
        texte_consentement: requirement.texte_consentement,
        version_texte: requirement.version_texte,
        satisfait: evaluation.satisfied,
        repondu: evaluation.answered,
        raison: evaluation.reason,
        valeur_boolean: response?.valeur_boolean ?? null,
        valeur_texte: response?.valeur_texte ?? null,
        valeur_date: response?.valeur_date ?? null,
        document_id: response?.document_id ?? evaluation.documentId,
      };
    });

    // La notion "bloquante" est maintenant réellement transversale : une
    // exigence de licence peut donc bloquer si l'administrateur le souhaite,
    // tandis qu'une exigence Derby/compétition peut rester informative.
    // Pour un consentement, "satisfait" signifie bien que la réponse est OUI.
    const blockingMissing = evaluations.filter(
      (item) => item.obligatoire && item.bloquante && !item.satisfait,
    );
    const licenseMissing = evaluations.filter(
      (item) =>
        item.concerne_licence && item.obligatoire && !item.satisfait,
    );

    return {
      personne_id: personne.id,
      saison_id: saison.id,
      inscription_complete: blockingMissing.length === 0,
      licence_complete: licenseMissing.length === 0,
      exigences_manquantes_bloquantes: blockingMissing.map((item) => item.code),
      exigences_licence_manquantes: licenseMissing.map((item) => item.code),
      exigences: evaluations,
      preuve_medicale: medical,
    };
  }

  async saveResponse(
    dto: SauverReponseExigenceDto,
    projectId: number,
    compteId: number,
  ) {
    const requirement = await this.getEntity(dto.exigence_id, projectId);
    await this.assertSeason(dto.saison_id, projectId);
    const personne = await this.getOwnedPerson(dto.personne_id, compteId);
    if (dto.repondu_par_personne_id) {
      await this.getOwnedPerson(dto.repondu_par_personne_id, compteId);
    }
    if (!['CONSENTEMENT', 'DECLARATION'].includes(requirement.type_exigence)) {
      throw new BadRequestException(
        'Cette exigence est calculée depuis une donnée existante et ne reçoit pas de réponse directe',
      );
    }
    this.validateResponse(requirement, dto);

    let response = await this.reponseRepo.findOne({
      where: {
        exigence_id: requirement.id,
        personne_id: personne.id,
        saison_id: dto.saison_id,
        contexte_type: 'SAISON',
        contexte_id: IsNull(),
      },
    });
    if (!response) {
      response = this.reponseRepo.create({
        exigence_id: requirement.id,
        personne_id: personne.id,
        saison_id: dto.saison_id,
        souscription_personne_id: null,
        contexte_type: 'SAISON',
        contexte_id: null,
        valeur_boolean: null,
        valeur_texte: null,
        valeur_date: null,
        document_id: null,
        texte_accepte: null,
        version_acceptee: null,
        repondu_par_personne_id: null,
      });
    }
    Object.assign(response, {
      valeur_boolean: dto.valeur_boolean ?? null,
      valeur_texte: this.text(dto.valeur_texte),
      valeur_date: dto.valeur_date?.slice(0, 10) ?? null,
      document_id: dto.document_id ?? null,
      texte_accepte:
        requirement.type_exigence === 'CONSENTEMENT'
          ? requirement.texte_consentement
          : null,
      version_acceptee:
        requirement.type_exigence === 'CONSENTEMENT'
          ? requirement.version_texte
          : null,
      repondu_par_personne_id:
        dto.repondu_par_personne_id ?? personne.id,
      date_reponse: new Date(),
      updated_at: new Date(),
    });
    await this.reponseRepo.save(response);
    return this.evaluate(dto, projectId, compteId);
  }

  async assertSubscriptionRequirements(
    dto: EvaluerDossierPersonneDto,
    projectId: number,
    compteId: number,
  ) {
    const result = await this.evaluate(dto, projectId, compteId);
    if (!result.inscription_complete) {
      const missingCodes = new Set(result.exigences_manquantes_bloquantes);
      const labels = result.exigences
        .filter((item) => missingCodes.has(item.code))
        .map((item) => item.libelle);
      throw new BadRequestException(
        `Dossier incomplet pour cette personne : ${labels.join(', ')}`,
      );
    }
    return result;
  }

  private async get(id: number, projectId: number) {
    const entity = await this.getEntity(id, projectId);
    return (await this.withScopes([entity]))[0];
  }

  private async withScopes(
    exigences: ExigenceDossierEntity[],
  ): Promise<RequirementWithScopes[]> {
    const scopes = exigences.length
      ? await this.porteeRepo.find({
          where: { exigence_id: In(exigences.map((item) => item.id)) },
          order: { id: 'ASC' },
        })
      : [];
    return exigences.map((item) => ({
      ...item,
      portees: scopes.filter((scope) => scope.exigence_id === item.id),
    }));
  }

  private async getEntity(id: number, projectId: number) {
    const entity = await this.exigenceRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Exigence introuvable');
    if (entity.project_id !== projectId) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
    return entity;
  }

  private async getOwnedPerson(id: number, compteId: number) {
    const person = await this.personneRepo.findOne({ where: { id } });
    if (!person) throw new NotFoundException('Personne introuvable');
    if (person.compte !== compteId) throw new ForbiddenException('PERSONNE_HORS_COMPTE');
    return person;
  }

  private async validateDto(dto: SaveExigenceDossierDto, projectId: number) {
    if (!dto.code.trim()) throw new BadRequestException('Le code est obligatoire');
    if (!dto.libelle.trim()) {
      throw new BadRequestException('Le libellé est obligatoire');
    }
    if (!dto.portees.length) {
      throw new BadRequestException('Ajoute au moins une portée');
    }
    if (
      dto.age_min != null &&
      dto.age_max != null &&
      dto.age_min > dto.age_max
    ) {
      throw new BadRequestException("L'âge minimum dépasse l'âge maximum");
    }
    if (dto.saison_id) await this.assertSeason(dto.saison_id, projectId);

    const groupIds = dto.portees
      .filter((item) => item.type_portee === 'GROUPE')
      .map((item) => Number(item.cible_id));
    if (groupIds.length) {
      const groups = await this.groupeRepo.find({ where: { id: In(groupIds) } });
      if (
        groups.length !== new Set(groupIds).size ||
        groups.some(
          (group) => dto.saison_id && group.saison_id !== dto.saison_id,
        )
      ) {
        throw new BadRequestException('Une portée groupe est invalide');
      }
    }

    const tariffIds = dto.portees
      .filter((item) => item.type_portee === 'TARIF')
      .map((item) => Number(item.cible_id));
    if (tariffIds.length) {
      const tariffs = await this.tarifRepo.find({ where: { id: In(tariffIds) } });
      if (
        tariffs.length !== new Set(tariffIds).size ||
        tariffs.some(
          (tariff) => dto.saison_id && tariff.saison_id !== dto.saison_id,
        )
      ) {
        throw new BadRequestException('Une portée tarif est invalide');
      }
    }

    for (const scope of dto.portees) {
      if (
        scope.type_portee === 'GENERAL' &&
        (scope.cible_id || scope.cible_code)
      ) {
        throw new BadRequestException('La portée générale ne prend pas de cible');
      }
      if (
        (scope.type_portee === 'GROUPE' || scope.type_portee === 'TARIF') &&
        !scope.cible_id
      ) {
        throw new BadRequestException('La portée sélectionnée nécessite une cible');
      }
      if (
        scope.type_portee === 'TYPE_LICENCE' &&
        !this.text(scope.cible_code)
      ) {
        throw new BadRequestException('Le type de licence est obligatoire');
      }
    }

    if (
      ['CHAMP_PERSONNE', 'CONTACT', 'DOCUMENT'].includes(dto.type_exigence) &&
      !this.text(dto.source_code)
    ) {
      throw new BadRequestException('La donnée source à contrôler est obligatoire');
    }
    if (dto.type_exigence === 'PREUVE_MEDICALE') {
      const medicalMode = this.text(dto.source_code)?.toUpperCase() ?? null;
      if (medicalMode && !['STANDARD', 'COMPETITION'].includes(medicalMode)) {
        throw new BadRequestException(
          'Le niveau de preuve médicale doit être STANDARD ou COMPETITION',
        );
      }
    }
    if (dto.type_exigence === 'CONSENTEMENT') {
      if (dto.type_reponse !== 'BOOLEEN') {
        throw new BadRequestException('Un consentement attend une réponse oui/non');
      }
      if (
        !this.text(dto.texte_consentement) ||
        !this.text(dto.version_texte)
      ) {
        throw new BadRequestException('Le texte et sa version sont obligatoires');
      }
    }
  }

  private validateResponse(
    requirement: ExigenceDossierEntity,
    dto: SauverReponseExigenceDto,
  ) {
    if (
      requirement.type_reponse === 'BOOLEEN' &&
      typeof dto.valeur_boolean !== 'boolean'
    ) {
      throw new BadRequestException('Une réponse oui/non est obligatoire');
    }
    if (
      requirement.type_reponse === 'TEXTE' &&
      !this.text(dto.valeur_texte)
    ) {
      throw new BadRequestException('Une réponse texte est obligatoire');
    }
    if (requirement.type_reponse === 'DATE' && !dto.valeur_date) {
      throw new BadRequestException('Une date est obligatoire');
    }
    if (requirement.type_reponse === 'DOCUMENT' && !dto.document_id) {
      throw new BadRequestException('Un document est obligatoire');
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

  private async assertContextTargets(
    dto: EvaluerDossierPersonneDto,
    seasonId: number,
  ) {
    if (dto.groupe_ids.length) {
      const groups = await this.groupeRepo.find({
        where: { id: In(dto.groupe_ids) },
      });
      if (
        groups.length !== new Set(dto.groupe_ids).size ||
        groups.some((group) => group.saison_id !== seasonId)
      ) {
        throw new BadRequestException('Un groupe du dossier est invalide');
      }
    }
    if (dto.tarif_inscription_id) {
      const tariff = await this.tarifRepo.findOne({
        where: { id: dto.tarif_inscription_id },
      });
      if (!tariff || tariff.saison_id !== seasonId) {
        throw new BadRequestException('Le tarif du dossier est invalide');
      }
    }
  }

  private matchesAge(requirement: ExigenceDossierEntity, age: number) {
    if (requirement.age_min != null && age < requirement.age_min) return false;
    if (requirement.age_max != null && age > requirement.age_max) return false;
    return true;
  }

  private matchingScopes(
    scopes: ExigenceDossierPorteeEntity[],
    dto: EvaluerDossierPersonneDto,
  ) {
    return scopes.filter((scope) => {
      if (scope.type_portee === 'GENERAL') return true;
      if (scope.type_portee === 'GROUPE') {
        return scope.cible_id != null && dto.groupe_ids.includes(scope.cible_id);
      }
      if (scope.type_portee === 'TARIF') {
        return scope.cible_id === dto.tarif_inscription_id;
      }
      return (
        scope.type_portee === 'TYPE_LICENCE' &&
        !!dto.type_licence &&
        scope.cible_code?.toUpperCase() === dto.type_licence.toUpperCase()
      );
    });
  }

  private effectiveFlag(
    scopes: ExigenceDossierPorteeEntity[],
    key: 'obligatoire_override' | 'bloquante_override',
    fallback: boolean,
  ) {
    const explicit = scopes
      .map((scope) => scope[key])
      .filter((value): value is boolean => typeof value === 'boolean');
    if (!explicit.length) return fallback;
    // Si plusieurs portées correspondent, la règle la plus stricte gagne.
    return explicit.some((value) => value === true);
  }

  private medicalRequirementRequiresCompetition(
    requirement: EffectiveRequirement,
    dto: EvaluerDossierPersonneDto,
  ) {
    const mode = (requirement.source_code ?? '').trim().toUpperCase();
    if (mode === 'COMPETITION') return true;
    if (mode === 'STANDARD') return false;

    // Compatibilité avec les exigences médicales historiques sans source_code.
    return (
      dto.type_licence === 'COMPETITION' &&
      (requirement.usage === 'LICENCE' || requirement.licence_scope_match)
    );
  }

  private evaluateRequirement(
    requirement: ExigenceDossierEntity,
    person: PersonneEntity,
    contacts: Contact[],
    documents: DocumentEntity[],
    response: ReponseExigenceDossierEntity | null,
  ): {
    satisfied: boolean;
    answered: boolean;
    reason: string | null;
    documentId: number | null;
  } {
    if (requirement.type_exigence === 'CHAMP_PERSONNE') {
      const value = this.personField(person, requirement.source_code);
      const satisfied = this.hasValue(value);
      return {
        satisfied,
        answered: satisfied,
        reason: satisfied ? null : 'Information manquante',
        documentId: null,
      };
    }
    if (requirement.type_exigence === 'CONTACT') {
      const expected = (requirement.source_code ?? '').toUpperCase();
      const found = contacts.some(
        (contact) =>
          contact.contact_type?.toUpperCase() === expected &&
          this.hasValue(contact.contact_value),
      );
      return {
        satisfied: found,
        answered: found,
        reason: found ? null : 'Contact manquant',
        documentId: null,
      };
    }
    if (requirement.type_exigence === 'DOCUMENT') {
      const expected = (requirement.source_code ?? '').toUpperCase();
      const candidates = documents.filter(
        (document) =>
          document.typedoc?.toUpperCase() === expected && document.valide !== false,
      );
      const valid = candidates.find((document) =>
        this.isDocumentValid(document, requirement.validite_mois),
      );
      return {
        satisfied: !!valid,
        answered: !!valid,
        reason: valid
          ? null
          : candidates.length
            ? 'Document expiré'
            : 'Document manquant',
        documentId: valid?.id ?? null,
      };
    }
    if (requirement.type_exigence === 'CONSENTEMENT') {
      const currentVersion = requirement.version_texte ?? null;
      const answered =
        typeof response?.valeur_boolean === 'boolean' &&
        response.version_acceptee === currentVersion;
      const satisfied = answered && response?.valeur_boolean === true;
      return {
        satisfied,
        answered,
        reason: !answered
          ? 'Consentement à renseigner'
          : satisfied
            ? null
            : 'Consentement refusé',
        documentId: null,
      };
    }

    const satisfied = this.responseHasValue(requirement, response);
    return {
      satisfied,
      answered: satisfied,
      reason: satisfied ? null : 'Réponse à renseigner',
      documentId: response?.document_id ?? null,
    };
  }

  private responseHasValue(
    requirement: ExigenceDossierEntity,
    response: ReponseExigenceDossierEntity | null,
  ) {
    if (!response) return false;
    if (requirement.type_reponse === 'BOOLEEN') {
      return typeof response.valeur_boolean === 'boolean';
    }
    if (requirement.type_reponse === 'TEXTE') {
      return this.hasValue(response.valeur_texte);
    }
    if (requirement.type_reponse === 'DATE') return !!response.valeur_date;
    if (requirement.type_reponse === 'DOCUMENT') return !!response.document_id;
    return true;
  }

  private personField(person: PersonneEntity, source: string | null) {
    switch ((source ?? '').toUpperCase()) {
      case 'FIRST_NAME':
        return person.first_name;
      case 'LAST_NAME':
        return person.last_name;
      case 'DATE_NAISSANCE':
        return person.date_naissance;
      case 'ADDRESS':
        return person.address;
      case 'PAYS':
        return person.pays;
      default:
        return null;
    }
  }

  private isDocumentValid(document: DocumentEntity, validityMonths: number | null) {
    const today = new Date();
    if (document.date_expiration) {
      return new Date(`${document.date_expiration}T23:59:59`) >= today;
    }
    if (!validityMonths) return true;
    if (!document.date_document) return false;
    const expires = new Date(`${document.date_document}T00:00:00`);
    expires.setMonth(expires.getMonth() + validityMonths);
    return expires >= today;
  }

  private civilAge(birthDate: string, seasonStart: string) {
    const birth = new Date(`${birthDate}T00:00:00`);
    const reference = new Date(`${seasonStart}T00:00:00`);
    let age = reference.getFullYear() - birth.getFullYear();
    const beforeBirthday =
      reference.getMonth() < birth.getMonth() ||
      (reference.getMonth() === birth.getMonth() &&
        reference.getDate() < birth.getDate());
    if (beforeBirthday) age -= 1;
    return age;
  }

  private async assertUnique(
    code: string,
    seasonId: number | null,
    projectId: number,
    exceptId?: number,
  ) {
    const query = this.exigenceRepo
      .createQueryBuilder('item')
      .where('item.project_id = :projectId', { projectId })
      .andWhere('COALESCE(item.saison_id, 0) = COALESCE(:seasonId, 0)', {
        seasonId,
      })
      .andWhere('LOWER(BTRIM(item.code)) = LOWER(BTRIM(:code))', { code });
    if (exceptId) query.andWhere('item.id <> :exceptId', { exceptId });
    if (await query.getOne()) {
      throw new BadRequestException(
        'Ce code existe déjà pour cette portée saisonnière',
      );
    }
  }

  private hasValue(value: unknown) {
    return value != null && String(value).trim().length > 0;
  }

  private text(value: string | null | undefined): string | null {
    const result = (value ?? '').trim();
    return result || null;
  }
}

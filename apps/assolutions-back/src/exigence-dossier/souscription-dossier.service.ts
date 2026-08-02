import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { Contact } from '../contact/contact.entity';
import { DocumentEntity } from '../document/document.entity';
import { InscriptionSaisonEntity } from '../inscription_saison/inscription_saison.entity';
import { LienGroupeEntity } from '../lien_groupe/lien_groupe.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { SouscriptionEntity } from '../souscription/souscription.entity';
import { SouscriptionPersonneEntity } from '../souscription/souscription-personne.entity';
import { SouscriptionPersonneGroupeEntity } from '../souscription/souscription-personne-groupe.entity';
import { SaveSouscriptionDto } from '../souscription/souscription.dto';
import { DossierPersonneSaisonEntity } from './dossier-personne-saison.entity';
import { SaveDossierDocumentDto } from './dossier-document.dto';
import { ExigenceDossierService } from './exigence-dossier.service';
import { PreuveMedicaleService } from './preuve-medicale.service';

@Injectable()
export class SouscriptionDossierService {
  constructor(
    @InjectRepository(SouscriptionEntity)
    private readonly souscriptionRepo: Repository<SouscriptionEntity>,
    @InjectRepository(SouscriptionPersonneEntity)
    private readonly ligneRepo: Repository<SouscriptionPersonneEntity>,
    @InjectRepository(SouscriptionPersonneGroupeEntity)
    private readonly ligneGroupeRepo: Repository<SouscriptionPersonneGroupeEntity>,
    @InjectRepository(PersonneEntity)
    private readonly personneRepo: Repository<PersonneEntity>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(DossierPersonneSaisonEntity)
    private readonly dossierRepo: Repository<DossierPersonneSaisonEntity>,
    private readonly exigences: ExigenceDossierService,
    private readonly preuvesMedicales: PreuveMedicaleService,
    private readonly dataSource: DataSource,
  ) {}

  async completeCountry(personneId: number, pays: string, compteId: number) {
    const personne = await this.getOwnedPerson(personneId, compteId);
    personne.pays = pays.trim() || 'France';
    personne.date_maj = new Date();
    await this.personneRepo.save(personne);
  }

  async saveDocument(
    dto: SaveDossierDocumentDto,
    projectId: number,
    compteId: number,
  ) {
    await this.getOwnedPerson(dto.personne_id, compteId);
    const raw = dto.data_base64.includes(',')
      ? dto.data_base64.split(',').pop() ?? ''
      : dto.data_base64;
    if (!raw) throw new BadRequestException('Fichier vide');
    const file = Buffer.from(raw, 'base64');
    if (!file.length) throw new BadRequestException('Fichier invalide');
    if (file.length > 10 * 1024 * 1024) {
      throw new BadRequestException('Le fichier dépasse 10 Mo');
    }
    return this.documentRepo.save(
      this.documentRepo.create({
        titre: dto.titre.trim(),
        objet_id: dto.personne_id,
        objet_type: 'rider',
        typedoc: dto.typedoc.trim().toUpperCase(),
        file_data: file,
        file_path: null,
        storage_type: 'DB',
        mimetype: dto.mimetype,
        date_document: dto.date_document?.slice(0, 10) ?? null,
        date_expiration: null,
        valide: true,
        commentaire: null,
        auteur: null,
        project_id: projectId,
      }),
    );
  }

  async syncDraft(
    souscriptionId: number,
    dto: SaveSouscriptionDto,
    projectId: number,
    compteId: number,
  ) {
    const subscription = await this.getOwnedSubscription(
      souscriptionId,
      projectId,
      compteId,
    );
    const lines = await this.ligneRepo.find({
      where: { souscription_id: subscription.id },
    });
    const lineByPerson = new Map(lines.map((line) => [line.personne_id, line]));
    for (const choice of dto.personnes) {
      const line = lineByPerson.get(Number(choice.personne_id));
      if (!line) continue;
      line.type_licence = choice.type_licence ?? 'LOISIR';
      line.updated_at = new Date();
      await this.ligneRepo.save(line);
    }
    return this.validateAndSnapshot(subscription.id, projectId, compteId, false);
  }

  async validateAndSnapshot(
    souscriptionId: number,
    projectId: number,
    compteId: number,
    throwIfIncomplete = true,
  ) {
    const subscription = await this.getOwnedSubscription(
      souscriptionId,
      projectId,
      compteId,
    );
    const lines = await this.ligneRepo.find({
      where: { souscription_id: subscription.id },
      order: { id: 'ASC' },
    });
    const groupLinks = lines.length
      ? await this.ligneGroupeRepo.find({
          where: { souscription_personne_id: In(lines.map((line) => line.id)) },
        })
      : [];

    const results = [];
    for (const line of lines) {
      const person = await this.getOwnedPerson(line.personne_id, compteId);
      const contacts = await this.contactRepo.find({
        where: { object_type: 'rider', object_id: person.id },
      });
      const groupIds = groupLinks
        .filter((link) => link.souscription_personne_id === line.id)
        .map((link) => link.groupe_id);
      const evaluation = await this.exigences.evaluate(
        {
          saison_id: subscription.saison_id,
          personne_id: person.id,
          groupe_ids: groupIds,
          tarif_inscription_id: line.tarif_inscription_id,
          type_licence: line.type_licence,
        },
        projectId,
        compteId,
      );
      const medical = await this.preuvesMedicales.evaluate(
        {
          personne_id: person.id,
          saison_id: subscription.saison_id,
          type_licence: line.type_licence,
        },
        projectId,
        compteId,
      );
      const otherLicenceMissing = evaluation.exigences.some(
        (item) =>
          item.usage === 'LICENCE' &&
          item.obligatoire &&
          item.type_exigence !== 'PREUVE_MEDICALE' &&
          !item.satisfait,
      );
      const medicalRequired = evaluation.exigences.some(
        (item) =>
          item.usage === 'LICENCE' &&
          item.obligatoire &&
          item.type_exigence === 'PREUVE_MEDICALE',
      );
      const licenceEligible =
        !otherLicenceMissing && (!medicalRequired || medical.eligible);
      const snapshot = this.snapshot(person, contacts);

      line.donnees_personne_snapshot = snapshot;
      line.informations_validees_at = new Date();
      line.dossier_complet = evaluation.inscription_complete;
      line.updated_at = new Date();
      await this.ligneRepo.save(line);
      await this.upsertSeasonDossier(
        projectId,
        subscription.saison_id,
        person.id,
        line.type_licence,
        snapshot,
        evaluation.inscription_complete,
        licenceEligible,
      );
      results.push({
        personne_id: person.id,
        personne_nom: `${person.first_name} ${person.last_name}`.trim(),
        type_licence: line.type_licence,
        inscription_complete: evaluation.inscription_complete,
        licence_eligible: licenceEligible,
        evaluation,
        preuve_medicale: medical,
      });
    }

    const incomplete = results.filter((item) => !item.inscription_complete);
    if (throwIfIncomplete && incomplete.length) {
      throw new BadRequestException(
        incomplete
          .map(
            (item) =>
              `${item.personne_nom} : ${item.evaluation.exigences
                .filter(
                  (requirement) =>
                    requirement.usage === 'INSCRIPTION' &&
                    requirement.obligatoire &&
                    requirement.bloquante &&
                    !requirement.satisfait,
                )
                .map((requirement) => requirement.libelle)
                .join(', ')}`,
          )
          .join(' · '),
      );
    }
    return results;
  }

  async simulatePayment(
    souscriptionId: number,
    result: 'OK' | 'KO',
    projectId: number,
    compteId: number,
  ) {
    this.assertLocalSimulation();
    const subscription = await this.getOwnedSubscription(
      souscriptionId,
      projectId,
      compteId,
    );
    if (result === 'KO') {
      subscription.statut = 'ERREUR';
      subscription.helloasso_payment_state = 'SIMULATED_REFUSED';
      subscription.error_message = 'Paiement refusé en simulation locale';
      subscription.updated_at = new Date();
      await this.souscriptionRepo.save(subscription);
      return { paiement_confirme: false, message: 'Paiement refusé simulé' };
    }
    await this.validateAndSnapshot(subscription.id, projectId, compteId, true);
    await this.finalize(subscription.id);
    return {
      paiement_confirme: true,
      message: 'Paiement accepté simulé, inscriptions activées',
    };
  }

  private async finalize(subscriptionId: number) {
    await this.dataSource.transaction(async (manager) => {
      const subscriptionRepo = manager.getRepository(SouscriptionEntity);
      const lineRepo = manager.getRepository(SouscriptionPersonneEntity);
      const lineGroupRepo = manager.getRepository(
        SouscriptionPersonneGroupeEntity,
      );
      const registrationRepo = manager.getRepository(InscriptionSaisonEntity);
      const groupLinkRepo = manager.getRepository(LienGroupeEntity);
      const subscription = await subscriptionRepo.findOne({
        where: { id: subscriptionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!subscription || subscription.statut === 'FINALISEE') return;
      const lines = await lineRepo.find({
        where: { souscription_id: subscription.id },
      });
      const links = lines.length
        ? await lineGroupRepo.find({
            where: { souscription_personne_id: In(lines.map((line) => line.id)) },
          })
        : [];
      for (const line of lines) {
        let registration = await registrationRepo.findOne({
          where: {
            saison_id: subscription.saison_id,
            personne_id: line.personne_id,
          },
        });
        if (!registration) {
          registration = registrationRepo.create({
            saison_id: subscription.saison_id,
            personne_id: line.personne_id,
            active: true,
          });
        } else {
          registration.active = true;
          registration.date_inscription = new Date();
        }
        registration = await registrationRepo.save(registration);
        for (const selected of links.filter(
          (item) => item.souscription_personne_id === line.id,
        )) {
          const exists = await groupLinkRepo.findOne({
            where: {
              groupe_id: selected.groupe_id,
              object_id: line.personne_id,
              object_type: 'rider',
            },
          });
          if (!exists) {
            await groupLinkRepo.save(
              groupLinkRepo.create({
                groupe_id: selected.groupe_id,
                object_id: line.personne_id,
                object_type: 'rider',
                date_maj: new Date(),
              }),
            );
          }
        }
        line.statut = 'ACTIVE';
        line.inscription_saison_id = registration.id;
        line.updated_at = new Date();
        await lineRepo.save(line);
      }
      subscription.statut = 'FINALISEE';
      subscription.helloasso_payment_state = 'SIMULATED_PAID';
      subscription.paid_at = new Date();
      subscription.finalized_at = new Date();
      subscription.updated_at = new Date();
      await subscriptionRepo.save(subscription);
    });
  }

  private async upsertSeasonDossier(
    projectId: number,
    seasonId: number,
    personId: number,
    licenceType: 'LOISIR' | 'COMPETITION',
    snapshot: Record<string, unknown>,
    registrationComplete: boolean,
    licenceEligible: boolean,
  ) {
    let dossier = await this.dossierRepo.findOne({
      where: {
        project_id: projectId,
        saison_id: seasonId,
        personne_id: personId,
      },
    });
    dossier ??= this.dossierRepo.create({
      project_id: projectId,
      saison_id: seasonId,
      personne_id: personId,
      type_licence: licenceType,
      informations_validees_at: null,
      donnees_personne_snapshot: null,
      inscription_complete: false,
      licence_eligible: false,
    });
    dossier.type_licence = licenceType;
    dossier.informations_validees_at = new Date();
    dossier.donnees_personne_snapshot = snapshot;
    dossier.inscription_complete = registrationComplete;
    dossier.licence_eligible = licenceEligible;
    dossier.updated_at = new Date();
    await this.dossierRepo.save(dossier);
  }

  private snapshot(person: PersonneEntity, contacts: Contact[]) {
    return {
      first_name: person.first_name,
      last_name: person.last_name,
      date_naissance: person.date_naissance,
      address: person.address,
      pays: person.pays || 'France',
      email: this.contact(contacts, 'EMAIL'),
      telephone: this.contact(contacts, 'PHONE'),
    };
  }

  private contact(contacts: Contact[], type: string) {
    return (
      contacts.find(
        (item) =>
          item.contact_type?.trim().toUpperCase() === type &&
          !!item.contact_value?.trim(),
      )?.contact_value?.trim() ?? null
    );
  }

  private assertLocalSimulation() {
    const explicit = (process.env.APP_ENV ?? '').trim().toLowerCase();
    const front = (
      process.env.HELLOASSO_FRONT_URL ??
      process.env.FRONT_URL ??
      ''
    ).toLowerCase();
    if (
      explicit &&
      explicit !== 'local' &&
      !front.includes('localhost') &&
      !front.includes('127.0.0.1')
    ) {
      throw new ForbiddenException('Simulation disponible uniquement en local');
    }
  }

  private async getOwnedSubscription(
    id: number,
    projectId: number,
    compteId: number,
  ) {
    const subscription = await this.souscriptionRepo.findOne({ where: { id } });
    if (!subscription) throw new NotFoundException('Souscription introuvable');
    if (
      subscription.project_id !== projectId ||
      subscription.compte_id !== compteId
    ) {
      throw new ForbiddenException('SOUSCRIPTION_HORS_COMPTE_OU_PROJET');
    }
    return subscription;
  }

  private async getOwnedPerson(id: number, compteId: number) {
    const person = await this.personneRepo.findOne({
      where: { id, compte: compteId, archive: false },
    });
    if (!person) throw new ForbiddenException('PERSONNE_HORS_COMPTE');
    return person;
  }
}

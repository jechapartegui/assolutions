import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';

import { InscriptionSaisonEntity } from '../inscription_saison/inscription_saison.entity';
import { LienGroupeEntity } from '../lien_groupe/lien_groupe.entity';
import { SouscriptionEntity } from '../souscription/souscription.entity';
import { SouscriptionPersonneEntity } from '../souscription/souscription-personne.entity';
import { SouscriptionPersonneGroupeEntity } from '../souscription/souscription-personne-groupe.entity';
import { SouscriptionDossierService } from './souscription-dossier.service';

@Injectable()
export class SouscriptionAdminService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly dossiers: SouscriptionDossierService,
  ) {}

  async validateManualPayment(
    subscriptionId: number,
    projectId: number,
    accountId: number,
  ) {
    await this.dossiers.validateAndSnapshot(
      subscriptionId,
      projectId,
      accountId,
      true,
    );

    await this.dataSource.transaction(async (manager) => {
      const subscriptionRepo = manager.getRepository(SouscriptionEntity);
      const lineRepo = manager.getRepository(SouscriptionPersonneEntity);
      const groupChoiceRepo = manager.getRepository(
        SouscriptionPersonneGroupeEntity,
      );
      const registrationRepo = manager.getRepository(InscriptionSaisonEntity);
      const groupLinkRepo = manager.getRepository(LienGroupeEntity);

      const subscription = await subscriptionRepo.findOne({
        where: {
          id: subscriptionId,
          project_id: projectId,
          compte_id: accountId,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!subscription) throw new NotFoundException('Souscription introuvable');
      if (subscription.statut === 'FINALISEE') return;

      const lines = await lineRepo.find({
        where: { souscription_id: subscription.id },
      });
      const choices = lines.length
        ? await groupChoiceRepo.find({
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
        registration ??= registrationRepo.create({
          saison_id: subscription.saison_id,
          personne_id: line.personne_id,
          active: true,
        });
        registration.active = true;
        registration.date_inscription = new Date();
        registration = await registrationRepo.save(registration);

        for (const choice of choices.filter(
          (item) => item.souscription_personne_id === line.id,
        )) {
          const exists = await groupLinkRepo.findOne({
            where: {
              groupe_id: choice.groupe_id,
              object_id: line.personne_id,
              object_type: 'rider',
            },
          });
          if (!exists) {
            await groupLinkRepo.save(
              groupLinkRepo.create({
                groupe_id: choice.groupe_id,
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
      subscription.helloasso_payment_state = 'MANUAL_PAID';
      subscription.paid_at = new Date();
      subscription.finalized_at = new Date();
      subscription.updated_at = new Date();
      subscription.error_message = null;
      await subscriptionRepo.save(subscription);
    });

    return {
      paiement_confirme: true,
      message: 'Paiement validé manuellement par un administrateur',
    };
  }
}

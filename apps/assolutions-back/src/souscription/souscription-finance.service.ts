import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource, In } from 'typeorm';

import { FluxFinancierEntity } from '../flux_financier/flux_financier.entity';
import { HelloAssoService } from '../helloasso/helloasso.service';
import { OperationEntity } from '../operation/operation.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { TarifInscriptionEntity } from '../tarif_inscription/tarif_inscription.entity';
import { SouscriptionEntity } from './souscription.entity';
import { SouscriptionPersonneEntity } from './souscription-personne.entity';

@Injectable()
export class SouscriptionFinanceService {
  private readonly logger = new Logger(SouscriptionFinanceService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly helloAsso: HelloAssoService,
  ) {}

  async ensureForFinalized(
    subscriptionId: number,
    projectId?: number,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const subscriptionRepo = manager.getRepository(SouscriptionEntity);
      const fluxRepo = manager.getRepository(FluxFinancierEntity);
      const operationRepo = manager.getRepository(OperationEntity);
      const lineRepo = manager.getRepository(SouscriptionPersonneEntity);
      const tariffRepo = manager.getRepository(TarifInscriptionEntity);
      const personneRepo = manager.getRepository(PersonneEntity);

      const subscription = await subscriptionRepo.findOne({
        where: { id: Number(subscriptionId) },
        lock: { mode: 'pessimistic_write' },
      });

      if (!subscription || subscription.statut !== 'FINALISEE') {
        return;
      }

      if (
        projectId != null
        && Number(subscription.project_id) !== Number(projectId)
      ) {
        throw new BadRequestException('Souscription hors projet');
      }

      const origin = this.origin(subscription.id);
      const existingFlux = await fluxRepo.findOne({
        where: {
          project_id: subscription.project_id,
          origine: origin,
        },
      });

      // Idempotence : confirmation retour + webhook peuvent arriver presque
      // simultanément. Un seul flux doit être créé pour la souscription.
      if (existingFlux) {
        return;
      }

      const lines = await lineRepo.find({
        where: { souscription_id: subscription.id },
        order: { id: 'ASC' },
      });

      if (!lines.length) {
        this.logger.warn(
          `Souscription ${subscription.id} finalisée sans ligne : aucun flux créé`,
        );
        return;
      }

      const tariffIds = Array.from(
        new Set(
          lines
            .map((line) => Number(line.tarif_inscription_id ?? 0))
            .filter((id) => id > 0),
        ),
      );
      const personIds = Array.from(
        new Set(lines.map((line) => Number(line.personne_id)).filter((id) => id > 0)),
      );

      const [tariffs, people] = await Promise.all([
        tariffIds.length
          ? tariffRepo.find({ where: { id: In(tariffIds) } })
          : Promise.resolve([]),
        personIds.length
          ? personneRepo.find({ where: { id: In(personIds) } })
          : Promise.resolve([]),
      ]);

      const tariffById = new Map(tariffs.map((item) => [Number(item.id), item]));
      const personById = new Map(people.map((item) => [Number(item.id), item]));

      for (const line of lines) {
        const tariff = tariffById.get(Number(line.tarif_inscription_id ?? 0));
        if (!tariff) {
          throw new BadRequestException(
            `Tarif introuvable pour la ligne ${line.id} de la souscription ${subscription.id}`,
          );
        }
        if (!tariff.compte_bancaire_id) {
          throw new BadRequestException(
            `Aucun compte de recette n'est configuré sur le tarif "${tariff.nom}"`,
          );
        }
      }

      const paymentDate = this.dateOnly(
        subscription.paid_at ?? subscription.finalized_at ?? new Date(),
      );
      const payerName = [subscription.payeur_prenom, subscription.payeur_nom]
        .filter(Boolean)
        .join(' ')
        .trim() || subscription.payeur_email || `Souscription #${subscription.id}`;

      const flux = await fluxRepo.save(
        fluxRepo.create({
          libelle: `Inscription #${subscription.id}`,
          date: paymentDate,
          destinataire: payerName,
          recette: true,
          statut: 0,
          montant: this.euros(subscription.montant_total_centimes),
          info: `Paiement d'inscription${subscription.helloasso_checkout_intent_id ? ` - HelloAsso #${subscription.helloasso_checkout_intent_id}` : ''}`,
          project_id: subscription.project_id,
          saison_id: subscription.saison_id,
          classe_comptable_id: null,
          nb_paiement: Math.max(1, Number(subscription.nb_echeances ?? 1)),
          type_frais: null,
          personne_id: subscription.payeur_personne_id ?? null,
          contrat_prof_id: null,
          flux_systeme: false,
          origine: origin,
        }),
      );

      for (const line of lines) {
        const tariff = tariffById.get(Number(line.tarif_inscription_id))!;
        const person = personById.get(Number(line.personne_id));
        const personName = person
          ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim()
          : `Personne #${line.personne_id}`;

        await operationRepo.save(
          operationRepo.create({
            // Une recette est positive dans le module finance.
            solde: this.euros(line.prix_final_centimes),
            date_operation: paymentDate,
            date_previsionnelle: paymentDate,
            mode: 0,
            destinataire: personName,
            paiement_execute: true,
            compte_bancaire_id: Number(tariff.compte_bancaire_id),
            flux_financier_id: flux.id,
            libelle_bancaire: `Inscription ${personName}`,
            import_key: `SOUSCRIPTION:${subscription.id}:${line.id}`,
            source_import: 'SOUSCRIPTION',
            info: `${tariff.nom} - souscription #${subscription.id}`,
          }),
        );
      }
    });
  }

  async ensureFromWebhook(payload: unknown): Promise<void> {
    const checkoutId = this.helloAsso.extractCheckoutIntentId(payload);
    if (!checkoutId) return;

    const subscription = await this.dataSource
      .getRepository(SouscriptionEntity)
      .findOne({ where: { helloasso_checkout_intent_id: checkoutId } });

    if (!subscription) return;
    await this.ensureForFinalized(subscription.id, subscription.project_id);
  }

  private origin(subscriptionId: number): string {
    return `SOUSCRIPTION:${subscriptionId}`;
  }

  private euros(centimes: number | null | undefined): number {
    return Number((Number(centimes ?? 0) / 100).toFixed(2));
  }

  private dateOnly(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString().slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
  }
}

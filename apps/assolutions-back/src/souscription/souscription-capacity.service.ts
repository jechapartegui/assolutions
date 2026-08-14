import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import { GroupesEntity } from '../groupes/groupes.entity';
import { HelloAssoService } from '../helloasso/helloasso.service';
import { LienGroupeEntity } from '../lien_groupe/lien_groupe.entity';
import { TarifInscriptionEntity } from '../tarif_inscription/tarif_inscription.entity';
import { SaveSouscriptionDto } from './souscription.dto';
import { SouscriptionEntity } from './souscription.entity';
import { SouscriptionPersonneEntity } from './souscription-personne.entity';
import { SouscriptionPersonneGroupeEntity } from './souscription-personne-groupe.entity';

type CapacitySelection = {
  saisonId: number;
  groupPersonIds: Map<number, Set<number>>;
  tariffPersonIds: Map<number, Set<number>>;
};

@Injectable()
export class SouscriptionCapacityService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly helloAsso: HelloAssoService,
  ) {}

  /**
   * Contrôle le panier avant son enregistrement.
   * Le calcul tient compte de TOUTES les personnes du panier : avec une limite
   * à 3 et 2 places déjà prises, un panier de 2 personnes est donc refusé.
   */
  async assertDraftCapacity(dto: SaveSouscriptionDto): Promise<void> {
    const selection = this.selectionFromDto(dto);
    await this.assertSelectionCapacity(selection, null);
  }

  /**
   * Recontrôle les capacités juste avant une action susceptible de finaliser
   * une souscription. Les dossiers déjà partis vers le paiement sont comptés
   * comme des réservations de place afin d'éviter de continuer à vendre une
   * place déjà engagée.
   */
  async assertSubscriptionCapacity(subscriptionId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const subscription = await manager.getRepository(SouscriptionEntity).findOne({
        where: { id: Number(subscriptionId) },
        lock: { mode: 'pessimistic_write' },
      });
      if (!subscription) {
        throw new NotFoundException('Souscription introuvable');
      }

      const lines = await manager.getRepository(SouscriptionPersonneEntity).find({
        where: { souscription_id: subscription.id },
      });
      const links = lines.length
        ? await manager.getRepository(SouscriptionPersonneGroupeEntity).find({
            where: { souscription_personne_id: In(lines.map((line) => line.id)) },
          })
        : [];

      const personByLineId = new Map(lines.map((line) => [line.id, line.personne_id]));
      const groupPersonIds = new Map<number, Set<number>>();
      for (const link of links) {
        const personId = personByLineId.get(link.souscription_personne_id);
        if (!personId) continue;
        this.addSelection(groupPersonIds, Number(link.groupe_id), Number(personId));
      }

      const tariffPersonIds = new Map<number, Set<number>>();
      for (const line of lines) {
        const tariffId = Number(line.tarif_inscription_id ?? 0);
        if (tariffId > 0) {
          this.addSelection(tariffPersonIds, tariffId, Number(line.personne_id));
        }
      }

      await this.assertSelectionCapacityWithManager(
        manager,
        {
          saisonId: Number(subscription.saison_id),
          groupPersonIds,
          tariffPersonIds,
        },
        subscription.id,
      );
    });
  }

  async assertWebhookCapacity(payload: unknown): Promise<void> {
    const checkoutId = this.helloAsso.extractCheckoutIntentId(payload);
    if (!checkoutId) return;

    const subscription = await this.dataSource.getRepository(SouscriptionEntity).findOne({
      where: { helloasso_checkout_intent_id: Number(checkoutId) },
    });
    if (!subscription) return;

    await this.assertSubscriptionCapacity(subscription.id);
  }

  private async assertSelectionCapacity(
    selection: CapacitySelection,
    excludedSubscriptionId: number | null,
  ): Promise<void> {
    await this.dataSource.transaction((manager) =>
      this.assertSelectionCapacityWithManager(
        manager,
        selection,
        excludedSubscriptionId,
      ),
    );
  }

  private async assertSelectionCapacityWithManager(
    manager: EntityManager,
    selection: CapacitySelection,
    excludedSubscriptionId: number | null,
  ): Promise<void> {
    const groupIds = [...selection.groupPersonIds.keys()];
    const tariffIds = [...selection.tariffPersonIds.keys()];

    const groups = groupIds.length
      ? await manager
          .getRepository(GroupesEntity)
          .createQueryBuilder('groupe')
          .where('groupe.id IN (:...groupIds)', { groupIds })
          .setLock('pessimistic_write')
          .getMany()
      : [];

    const tariffs = tariffIds.length
      ? await manager
          .getRepository(TarifInscriptionEntity)
          .createQueryBuilder('tarif')
          .where('tarif.id IN (:...tariffIds)', { tariffIds })
          .setLock('pessimistic_write')
          .getMany()
      : [];

    const [activeGroupCounts, reservedGroupCounts, tariffUsage] = await Promise.all([
      this.loadActiveGroupCounts(manager, selection.saisonId, groupIds),
      this.loadReservedGroupCounts(
        manager,
        selection.saisonId,
        groupIds,
        excludedSubscriptionId,
      ),
      this.loadTariffUsage(
        manager,
        selection.saisonId,
        tariffIds,
        excludedSubscriptionId,
      ),
    ]);

    for (const group of groups) {
      if (group.limit_nb == null) continue;

      const active = activeGroupCounts.get(group.id) ?? 0;
      const reserved = reservedGroupCounts.get(group.id) ?? 0;
      const incoming = selection.groupPersonIds.get(group.id)?.size ?? 0;
      const projected = active + reserved + incoming;
      const limit = Number(group.limit_nb);

      if (projected > limit) {
        const remaining = Math.max(0, limit - active - reserved);
        throw new ConflictException(
          remaining === 0
            ? `Le groupe « ${group.nom} » est complet.`
            : `Le groupe « ${group.nom} » n'a plus que ${remaining} place(s) disponible(s).`,
        );
      }
    }

    for (const tariff of tariffs) {
      if (tariff.limit_nb == null) continue;

      const used = tariffUsage.get(tariff.id) ?? 0;
      const incoming = selection.tariffPersonIds.get(tariff.id)?.size ?? 0;
      const limit = Number(tariff.limit_nb);

      if (used + incoming > limit) {
        const remaining = Math.max(0, limit - used);
        throw new ConflictException(
          remaining === 0
            ? `Le tarif « ${tariff.nom} » est épuisé.`
            : `Le tarif « ${tariff.nom} » n'a plus que ${remaining} place(s) disponible(s).`,
        );
      }
    }
  }

  private selectionFromDto(dto: SaveSouscriptionDto): CapacitySelection {
    const groupPersonIds = new Map<number, Set<number>>();
    const tariffPersonIds = new Map<number, Set<number>>();

    for (const choice of dto.personnes ?? []) {
      const personId = Number(choice.personne_id);
      for (const rawGroupId of choice.groupe_ids ?? []) {
        const groupId = Number(rawGroupId);
        if (groupId > 0 && personId > 0) {
          this.addSelection(groupPersonIds, groupId, personId);
        }
      }

      const tariffId = Number(choice.tarif_inscription_id);
      if (tariffId > 0 && personId > 0) {
        this.addSelection(tariffPersonIds, tariffId, personId);
      }
    }

    return {
      saisonId: Number(dto.saison_id),
      groupPersonIds,
      tariffPersonIds,
    };
  }

  private addSelection(
    target: Map<number, Set<number>>,
    key: number,
    personId: number,
  ): void {
    const values = target.get(key) ?? new Set<number>();
    values.add(personId);
    target.set(key, values);
  }

  private async loadActiveGroupCounts(
    manager: EntityManager,
    saisonId: number,
    groupIds: number[],
  ): Promise<Map<number, number>> {
    if (!groupIds.length) return new Map();

    const rows = await manager
      .getRepository(LienGroupeEntity)
      .createQueryBuilder('lien')
      .innerJoin('groupes', 'groupe', 'groupe.id = lien.groupe_id')
      .innerJoin(
        'inscription_saison',
        'inscription',
        'inscription.personne_id = lien.object_id AND inscription.saison_id = :saisonId AND inscription.active = true',
        { saisonId },
      )
      .select('lien.groupe_id', 'id')
      .addSelect('COUNT(DISTINCT lien.object_id)', 'count')
      .where('lien.object_type = :type', { type: 'rider' })
      .andWhere('groupe.saison_id = :saisonId', { saisonId })
      .andWhere('lien.groupe_id IN (:...groupIds)', { groupIds })
      .groupBy('lien.groupe_id')
      .getRawMany<{ id: string; count: string }>();

    return new Map(rows.map((row) => [Number(row.id), Number(row.count)]));
  }

  private async loadReservedGroupCounts(
    manager: EntityManager,
    saisonId: number,
    groupIds: number[],
    excludedSubscriptionId: number | null,
  ): Promise<Map<number, number>> {
    if (!groupIds.length) return new Map();

    const query = manager
      .getRepository(SouscriptionPersonneGroupeEntity)
      .createQueryBuilder('liaison')
      .innerJoin(
        SouscriptionPersonneEntity,
        'ligne',
        'ligne.id = liaison.souscription_personne_id',
      )
      .innerJoin(
        SouscriptionEntity,
        'souscription',
        'souscription.id = ligne.souscription_id',
      )
      .select('liaison.groupe_id', 'id')
      .addSelect('COUNT(DISTINCT ligne.personne_id)', 'count')
      .where('souscription.saison_id = :saisonId', { saisonId })
      .andWhere("souscription.statut = 'EN_ATTENTE_PAIEMENT'")
      .andWhere('liaison.groupe_id IN (:...groupIds)', { groupIds })
      .groupBy('liaison.groupe_id');

    if (excludedSubscriptionId) {
      query.andWhere('souscription.id <> :excludedSubscriptionId', {
        excludedSubscriptionId,
      });
    }

    const rows = await query.getRawMany<{ id: string; count: string }>();
    return new Map(rows.map((row) => [Number(row.id), Number(row.count)]));
  }

  private async loadTariffUsage(
    manager: EntityManager,
    saisonId: number,
    tariffIds: number[],
    excludedSubscriptionId: number | null,
  ): Promise<Map<number, number>> {
    if (!tariffIds.length) return new Map();

    const query = manager
      .getRepository(SouscriptionPersonneEntity)
      .createQueryBuilder('ligne')
      .innerJoin(
        SouscriptionEntity,
        'souscription',
        'souscription.id = ligne.souscription_id',
      )
      .select('ligne.tarif_inscription_id', 'id')
      .addSelect('COUNT(DISTINCT ligne.personne_id)', 'count')
      .where('souscription.saison_id = :saisonId', { saisonId })
      .andWhere(
        "souscription.statut IN ('EN_ATTENTE_PAIEMENT', 'PAYEE', 'FINALISEE')",
      )
      .andWhere('ligne.tarif_inscription_id IN (:...tariffIds)', { tariffIds })
      .groupBy('ligne.tarif_inscription_id');

    if (excludedSubscriptionId) {
      query.andWhere('souscription.id <> :excludedSubscriptionId', {
        excludedSubscriptionId,
      });
    }

    const rows = await query.getRawMany<{ id: string; count: string }>();
    return new Map(rows.map((row) => [Number(row.id), Number(row.count)]));
  }
}

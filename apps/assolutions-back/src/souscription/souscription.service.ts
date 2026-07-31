import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';

import { CompteEntity } from '../compte/compte.entity';
import { Contact } from '../contact/contact.entity';
import { GroupesEntity } from '../groupes/groupes.entity';
import { HelloAssoService } from '../helloasso/helloasso.service';
import { InscriptionSaisonEntity } from '../inscription_saison/inscription_saison.entity';
import { LienGroupeEntity } from '../lien_groupe/lien_groupe.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { GroupeTarifInscriptionEntity } from '../tarif_inscription/groupe_tarif_inscription.entity';
import { TarifInscriptionEntity } from '../tarif_inscription/tarif_inscription.entity';
import {
  CompleteSouscriptionPersonneDto,
  SaveSouscriptionDto,
  SouscriptionPersonneChoixDto,
  ValidateCodePromoDto,
} from './souscription.dto';
import { CodePromoEntity } from './code-promo.entity';
import { CodePromoTarifEntity } from './code-promo-tarif.entity';
import { SouscriptionEntity } from './souscription.entity';
import { SouscriptionEvenementEntity } from './souscription-evenement.entity';
import { SouscriptionPersonneEntity } from './souscription-personne.entity';
import { SouscriptionPersonneGroupeEntity } from './souscription-personne-groupe.entity';

type GroupCountMap = Map<number, number>;
type TarifUsageMap = Map<number, number>;

interface ValidatedLine {
  personne: PersonneEntity;
  choix: SouscriptionPersonneChoixDto;
  tarif: TarifInscriptionEntity;
  prixInitial: number;
  remise: number;
  prixFinal: number;
}

interface PromoResolution {
  entity: CodePromoEntity | null;
  code: string | null;
  libelle: string | null;
  totalDiscount: number;
  discountsByPersonId: Map<number, number>;
  message: string | null;
}

@Injectable()
export class SouscriptionService {
  constructor(
    @InjectRepository(SouscriptionEntity)
    private readonly souscriptionRepo: Repository<SouscriptionEntity>,
    @InjectRepository(SouscriptionPersonneEntity)
    private readonly ligneRepo: Repository<SouscriptionPersonneEntity>,
    @InjectRepository(SouscriptionPersonneGroupeEntity)
    private readonly ligneGroupeRepo: Repository<SouscriptionPersonneGroupeEntity>,
    @InjectRepository(SouscriptionEvenementEntity)
    private readonly eventRepo: Repository<SouscriptionEvenementEntity>,
    @InjectRepository(CodePromoEntity)
    private readonly promoRepo: Repository<CodePromoEntity>,
    @InjectRepository(CodePromoTarifEntity)
    private readonly promoTarifRepo: Repository<CodePromoTarifEntity>,
    @InjectRepository(PersonneEntity)
    private readonly personneRepo: Repository<PersonneEntity>,
    @InjectRepository(CompteEntity)
    private readonly compteRepo: Repository<CompteEntity>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
    @InjectRepository(GroupesEntity)
    private readonly groupeRepo: Repository<GroupesEntity>,
    @InjectRepository(TarifInscriptionEntity)
    private readonly tarifRepo: Repository<TarifInscriptionEntity>,
    @InjectRepository(GroupeTarifInscriptionEntity)
    private readonly tarifGroupeRepo: Repository<GroupeTarifInscriptionEntity>,
    @InjectRepository(InscriptionSaisonEntity)
    private readonly inscriptionSaisonRepo: Repository<InscriptionSaisonEntity>,
    @InjectRepository(LienGroupeEntity)
    private readonly lienGroupeRepo: Repository<LienGroupeEntity>,
    private readonly dataSource: DataSource,
    private readonly helloAsso: HelloAssoService,
  ) {}

  async getContext(saisonId: number, projectId: number, compteId: number) {
    const saison = await this.assertSaisonInProject(saisonId, projectId);
    const personnes = await this.personneRepo.find({
      where: { compte: compteId, archive: false },
      order: { first_name: 'ASC', last_name: 'ASC' },
    });
    const personneIds = personnes.map((p) => p.id);
    const contacts = personneIds.length
      ? await this.contactRepo.find({
          where: { object_type: 'rider', object_id: In(personneIds) },
        })
      : [];
    const groupes = await this.groupeRepo.find({
      where: { saison_id: saison.id },
      order: { par_defaut: 'DESC', nom: 'ASC' },
    });
    const tarifs = await this.tarifRepo.find({
      where: { saison_id: saison.id, actif: true },
      order: { ordre: 'ASC', nom: 'ASC' },
    });
    const tarifIds = tarifs.map((t) => t.id);
    const tariffLinks = tarifIds.length
      ? await this.tarifGroupeRepo.find({
          where: { tarif_inscription_id: In(tarifIds) },
        })
      : [];
    const groupCounts = await this.loadActiveGroupCounts(saison.id);
    const tariffUsage = await this.loadPaidTarifUsage(saison.id);
    const previousActiveIds = await this.loadPreviousActivePersonIds(
      saison.saison_precedente,
      personneIds,
    );
    const previousGroups = await this.loadPreviousGroups(
      saison.saison_precedente,
      personneIds,
    );

    const contactsByPerson = new Map<number, Contact[]>();
    for (const contact of contacts) {
      const list = contactsByPerson.get(contact.object_id) ?? [];
      list.push(contact);
      contactsByPerson.set(contact.object_id, list);
    }
    const linksByTariff = new Map<number, number[]>();
    for (const link of tariffLinks) {
      const ids = linksByTariff.get(link.tarif_inscription_id) ?? [];
      ids.push(link.groupe_id);
      linksByTariff.set(link.tarif_inscription_id, ids);
    }

    const personViews = personnes.map((personne) => {
      const birthYear = this.birthYear(personne.date_naissance);
      const civilAge = this.civilAge(personne.date_naissance, saison.date_debut);
      const personContacts = contactsByPerson.get(personne.id) ?? [];
      const email = this.findContact(personContacts, 'EMAIL');
      const telephone = this.findContact(personContacts, 'PHONE');
      const missing = this.getMissingPersonFields(personne, email, telephone);
      const isReinscription = previousActiveIds.has(personne.id);

      const groupOptions = groupes.map((groupe) => {
        const count = groupCounts.get(groupe.id) ?? 0;
        const reason = this.groupIneligibilityReason(
          groupe,
          birthYear,
          civilAge,
          count,
        );
        return {
          id: groupe.id,
          nom: groupe.nom,
          par_defaut: !!groupe.par_defaut,
          visible: !!groupe.visible,
          eligible: !reason,
          complet: groupe.limit_nb != null && count >= Number(groupe.limit_nb),
          raison_indisponibilite: reason,
          nb_actifs: count,
          limit_nb: groupe.limit_nb ?? null,
        };
      });

      const tariffOptions = tarifs.map((tarif) => {
        const groupIds = linksByTariff.get(tarif.id) ?? [];
        const reason = this.tarifIneligibilityReason(
          tarif,
          birthYear,
          civilAge,
          isReinscription,
          tariffUsage.get(tarif.id) ?? 0,
        );
        return {
          id: tarif.id,
          nom: tarif.nom,
          prix_centimes: tarif.prix_centimes,
          paiement_plusieurs_fois: tarif.paiement_plusieurs_fois,
          general: groupIds.length === 0,
          groupe_ids: [...groupIds].sort((a, b) => a - b),
          eligible: !reason,
          raison_indisponibilite: reason,
        };
      });
      tariffOptions.sort((a, b) => {
        if (a.general !== b.general) return a.general ? -1 : 1;
        return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
      });

      return {
        id: personne.id,
        first_name: personne.first_name,
        last_name: personne.last_name,
        nickname: personne.nickname,
        date_naissance: personne.date_naissance,
        address: personne.address,
        email,
        telephone,
        age_civil: civilAge,
        reinscription: isReinscription,
        informations_completes: missing.length === 0,
        champs_manquants: missing,
        groupe_ids_precedents: previousGroups.get(personne.id) ?? [],
        groupes: groupOptions,
        tarifs: tariffOptions,
      };
    });

    const draft = await this.souscriptionRepo.findOne({
      where: { saison_id: saison.id, compte_id: compteId, statut: 'BROUILLON' },
      order: { id: 'DESC' },
    });

    return {
      saison: {
        id: saison.id,
        nom: saison.nom,
        date_debut: saison.date_debut,
        date_fin: saison.date_fin,
        saison_precedente: saison.saison_precedente ?? null,
      },
      personnes: personViews,
      brouillon: draft ? await this.toView(draft.id, compteId, projectId) : null,
    };
  }

  async completePerson(
    personneId: number,
    dto: CompleteSouscriptionPersonneDto,
    compteId: number,
  ) {
    const personne = await this.getOwnedPerson(personneId, compteId);
    personne.first_name = dto.first_name.trim();
    personne.last_name = dto.last_name.trim();
    personne.date_naissance = dto.date_naissance.slice(0, 10);
    personne.address = dto.address.trim();
    personne.date_maj = new Date();
    await this.personneRepo.save(personne);
    await this.upsertContact(personne.id, 'EMAIL', dto.email.trim());
    await this.upsertContact(personne.id, 'PHONE', dto.telephone.trim());
    return { ok: true };
  }

  async validateCodePromo(dto: ValidateCodePromoDto, projectId: number) {
    const saison = await this.assertSaisonInProject(dto.saison_id, projectId);
    const tariffs = await this.tarifRepo.find({
      where: { id: In(dto.tarif_ids), saison_id: saison.id },
    });
    const fakeLines: ValidatedLine[] = tariffs.map((tarif, index) => ({
      personne: { id: index + 1 } as PersonneEntity,
      choix: {
        personne_id: index + 1,
        groupe_ids: [1],
        tarif_inscription_id: tarif.id,
      },
      tarif,
      prixInitial: tarif.prix_centimes,
      remise: 0,
      prixFinal: tarif.prix_centimes,
    }));
    const promo = await this.resolvePromo(
      dto.code,
      saison.id,
      projectId,
      fakeLines,
    );
    return {
      valide: !!promo.entity,
      code: promo.code,
      libelle: promo.libelle,
      montant_remise_centimes: promo.totalDiscount,
      message: promo.message,
    };
  }

  async saveDraft(dto: SaveSouscriptionDto, projectId: number, compteId: number) {
    const saison = await this.assertSaisonInProject(dto.saison_id, projectId);
    if (!dto.personnes?.length) {
      throw new BadRequestException('Sélectionne au moins une personne');
    }
    const duplicatePersonIds = this.findDuplicates(
      dto.personnes.map((item) => Number(item.personne_id)),
    );
    if (duplicatePersonIds.length) {
      throw new BadRequestException(
        `Une personne ne peut apparaître qu'une fois dans le panier : ${duplicatePersonIds.join(', ')}`,
      );
    }

    const requestedPersonIds = dto.personnes.map((item) => Number(item.personne_id));
    const ownedPeople = await this.personneRepo.find({
      where: {
        id: In([...requestedPersonIds, Number(dto.payeur_personne_id)]),
        compte: compteId,
        archive: false,
      },
    });
    const ownedById = new Map(ownedPeople.map((personne) => [personne.id, personne]));
    for (const personId of requestedPersonIds) {
      if (!ownedById.has(personId)) {
        throw new ForbiddenException(`PERSONNE_HORS_COMPTE:${personId}`);
      }
    }
    if (!ownedById.has(Number(dto.payeur_personne_id))) {
      throw new ForbiddenException('PAYEUR_HORS_COMPTE');
    }

    const contacts = await this.contactRepo.find({
      where: { object_type: 'rider', object_id: In(Array.from(ownedById.keys())) },
    });
    const contactsByPerson = new Map<number, Contact[]>();
    for (const contact of contacts) {
      const list = contactsByPerson.get(contact.object_id) ?? [];
      list.push(contact);
      contactsByPerson.set(contact.object_id, list);
    }
    for (const personId of requestedPersonIds) {
      const personne = ownedById.get(personId)!;
      const personContacts = contactsByPerson.get(personId) ?? [];
      const missing = this.getMissingPersonFields(
        personne,
        this.findContact(personContacts, 'EMAIL'),
        this.findContact(personContacts, 'PHONE'),
      );
      if (missing.length) {
        throw new BadRequestException(
          `${personne.first_name} ${personne.last_name} : informations manquantes (${missing.join(', ')})`,
        );
      }
    }

    const allGroupIds = Array.from(
      new Set(dto.personnes.flatMap((item) => item.groupe_ids.map(Number))),
    );
    const allTariffIds = Array.from(
      new Set(dto.personnes.map((item) => Number(item.tarif_inscription_id))),
    );
    const [groupes, tarifs, tariffLinks] = await Promise.all([
      this.groupeRepo.find({ where: { id: In(allGroupIds) } }),
      this.tarifRepo.find({ where: { id: In(allTariffIds) } }),
      this.tarifGroupeRepo.find({
        where: { tarif_inscription_id: In(allTariffIds) },
      }),
    ]);
    const groupById = new Map(groupes.map((g) => [g.id, g]));
    const tariffById = new Map(tarifs.map((t) => [t.id, t]));
    const linksByTariff = new Map<number, Set<number>>();
    for (const link of tariffLinks) {
      const values = linksByTariff.get(link.tarif_inscription_id) ?? new Set<number>();
      values.add(link.groupe_id);
      linksByTariff.set(link.tarif_inscription_id, values);
    }

    const groupCounts = await this.loadActiveGroupCounts(saison.id);
    const tariffUsage = await this.loadPaidTarifUsage(saison.id);
    const previousActiveIds = await this.loadPreviousActivePersonIds(
      saison.saison_precedente,
      requestedPersonIds,
    );
    const validatedLines: ValidatedLine[] = [];

    for (const choice of dto.personnes) {
      const personne = ownedById.get(Number(choice.personne_id))!;
      const birthYear = this.birthYear(personne.date_naissance);
      const civilAge = this.civilAge(personne.date_naissance, saison.date_debut);
      const uniqueGroupIds = Array.from(new Set(choice.groupe_ids.map(Number)));
      if (!uniqueGroupIds.length) {
        throw new BadRequestException(
          `${personne.first_name} : sélectionne au moins un groupe`,
        );
      }
      for (const groupId of uniqueGroupIds) {
        const groupe = groupById.get(groupId);
        if (!groupe || groupe.saison_id !== saison.id) {
          throw new BadRequestException(`Groupe ${groupId} invalide pour cette saison`);
        }
        const reason = this.groupIneligibilityReason(
          groupe,
          birthYear,
          civilAge,
          groupCounts.get(groupe.id) ?? 0,
        );
        if (reason) {
          throw new BadRequestException(
            `${personne.first_name} ne peut pas rejoindre ${groupe.nom} : ${reason}`,
          );
        }
      }

      const tarif = tariffById.get(Number(choice.tarif_inscription_id));
      if (!tarif || tarif.saison_id !== saison.id || !tarif.actif) {
        throw new BadRequestException('Tarif invalide pour cette saison');
      }
      const tariffReason = this.tarifIneligibilityReason(
        tarif,
        birthYear,
        civilAge,
        previousActiveIds.has(personne.id),
        tariffUsage.get(tarif.id) ?? 0,
      );
      if (tariffReason) {
        throw new BadRequestException(
          `${personne.first_name} ne peut pas utiliser ${tarif.nom} : ${tariffReason}`,
        );
      }
      const allowedGroups = linksByTariff.get(tarif.id) ?? new Set<number>();
      if (
        allowedGroups.size > 0 &&
        uniqueGroupIds.some((groupId) => !allowedGroups.has(groupId))
      ) {
        throw new BadRequestException(
          `Le tarif ${tarif.nom} n'est pas compatible avec tous les groupes choisis pour ${personne.first_name}`,
        );
      }
      validatedLines.push({
        personne,
        choix: { ...choice, groupe_ids: uniqueGroupIds },
        tarif,
        prixInitial: Number(tarif.prix_centimes),
        remise: 0,
        prixFinal: Number(tarif.prix_centimes),
      });
    }

    const maxInstallments = Math.min(
      ...validatedLines.map((line) => Number(line.tarif.paiement_plusieurs_fois || 1)),
    );
    if (dto.nb_echeances < 1 || dto.nb_echeances > maxInstallments) {
      throw new BadRequestException(
        `Le panier peut être payé en 1 à ${maxInstallments} fois`,
      );
    }

    const promo = await this.resolvePromo(
      dto.code_promo,
      saison.id,
      projectId,
      validatedLines,
    );
    for (const line of validatedLines) {
      line.remise = promo.discountsByPersonId.get(line.personne.id) ?? 0;
      line.prixFinal = Math.max(0, line.prixInitial - line.remise);
    }
    const initialAmount = validatedLines.reduce((sum, line) => sum + line.prixInitial, 0);
    const discountAmount = validatedLines.reduce((sum, line) => sum + line.remise, 0);
    const finalAmount = initialAmount - discountAmount;

    const subscriptionId = await this.dataSource.transaction(async (manager) => {
      const subscriptionRepo = manager.getRepository(SouscriptionEntity);
      const lineRepo = manager.getRepository(SouscriptionPersonneEntity);
      const lineGroupRepo = manager.getRepository(SouscriptionPersonneGroupeEntity);
      let subscription = await subscriptionRepo.findOne({
        where: { saison_id: saison.id, compte_id: compteId, statut: 'BROUILLON' },
        order: { id: 'DESC' },
      });
      if (!subscription) {
        subscription = subscriptionRepo.create({
          project_id: projectId,
          saison_id: saison.id,
          compte_id: compteId,
          payeur_personne_id: Number(dto.payeur_personne_id),
          statut: 'BROUILLON',
          montant_initial_centimes: 0,
          montant_remise_centimes: 0,
          montant_total_centimes: 0,
          nb_echeances: 1,
          code_promo_id: null,
          code_promo_applique: null,
          helloasso_checkout_intent_id: null,
          helloasso_order_id: null,
          helloasso_redirect_url: null,
          helloasso_payment_state: null,
          updated_at: new Date(),
          paid_at: null,
          finalized_at: null,
          canceled_at: null,
          error_message: null,
        });
      }
      subscription.project_id = projectId;
      subscription.payeur_personne_id = Number(dto.payeur_personne_id);
      subscription.montant_initial_centimes = initialAmount;
      subscription.montant_remise_centimes = discountAmount;
      subscription.montant_total_centimes = finalAmount;
      subscription.nb_echeances = Number(dto.nb_echeances);
      subscription.code_promo_id = promo.entity?.id ?? null;
      subscription.code_promo_applique = promo.code;
      subscription.updated_at = new Date();
      subscription.error_message = null;
      subscription = await subscriptionRepo.save(subscription);

      const oldLines = await lineRepo.find({
        where: { souscription_id: subscription.id },
      });
      if (oldLines.length) {
        await lineGroupRepo.delete({
          souscription_personne_id: In(oldLines.map((line) => line.id)),
        });
        await lineRepo.delete({ souscription_id: subscription.id });
      }
      for (const line of validatedLines) {
        const savedLine = await lineRepo.save(
          lineRepo.create({
            souscription_id: subscription.id,
            personne_id: line.personne.id,
            tarif_inscription_id: line.tarif.id,
            prix_initial_centimes: line.prixInitial,
            remise_centimes: line.remise,
            prix_final_centimes: line.prixFinal,
            statut: 'BROUILLON',
            inscription_saison_id: null,
            updated_at: new Date(),
          }),
        );
        await lineGroupRepo.save(
          line.choix.groupe_ids.map((groupId) =>
            lineGroupRepo.create({
              souscription_personne_id: savedLine.id,
              groupe_id: groupId,
            }),
          ),
        );
      }
      await this.addEvent(manager, subscription.id, 'BROUILLON_ENREGISTRE', {
        montant_initial_centimes: initialAmount,
        montant_remise_centimes: discountAmount,
        montant_total_centimes: finalAmount,
        code_promo: promo.code,
      });
      return subscription.id;
    });
    return this.toView(subscriptionId, compteId, projectId);
  }

  async getForAccount(id: number, projectId: number, compteId: number) {
    return this.toView(id, compteId, projectId);
  }

  async createCheckout(id: number, projectId: number, compteId: number) {
    const subscription = await this.getOwnedSubscription(id, compteId, projectId);
    if (['PAYEE', 'FINALISEE'].includes(subscription.statut)) {
      return {
        souscription: await this.toView(subscription.id, compteId, projectId),
        redirectUrl: subscription.helloasso_redirect_url,
      };
    }
    if (subscription.statut !== 'BROUILLON') {
      throw new BadRequestException(
        `La souscription ne peut pas être envoyée au paiement depuis l'état ${subscription.statut}`,
      );
    }
    const lines = await this.ligneRepo.find({
      where: { souscription_id: subscription.id },
    });
    if (!lines.length) throw new BadRequestException('Le panier est vide');
    if (subscription.montant_total_centimes === 0) {
      await this.finalize(subscription.id, 'FREE');
      return {
        souscription: await this.toView(subscription.id, compteId, projectId),
        redirectUrl: null,
      };
    }

    const payer = await this.getOwnedPerson(
      Number(subscription.payeur_personne_id),
      compteId,
    );
    const payerContacts = await this.contactRepo.find({
      where: { object_type: 'rider', object_id: payer.id },
    });
    const account = await this.compteRepo.findOne({ where: { id: compteId } });
    const email = this.findContact(payerContacts, 'EMAIL') || account?.login || '';
    if (!email) throw new BadRequestException("L'email du payeur est obligatoire");

    const initialAmount = Math.ceil(
      subscription.montant_total_centimes / Math.max(1, subscription.nb_echeances),
    );
    const checkout = await this.helloAsso.createCheckout({
      totalAmount: subscription.montant_total_centimes,
      initialAmount,
      itemName: `Adhésion ${subscription.saison_id} - dossier ${subscription.id}`,
      payer: {
        firstName: payer.first_name,
        lastName: payer.last_name,
        email,
      },
      returnPath: `/souscription/retour?sid=${subscription.id}`,
      backPath: `/souscription?sid=${subscription.id}`,
      errorPath: `/souscription/retour?sid=${subscription.id}&erreur=1`,
    });
    subscription.statut = 'EN_ATTENTE_PAIEMENT';
    subscription.helloasso_checkout_intent_id = checkout.id;
    subscription.helloasso_redirect_url = checkout.redirectUrl;
    subscription.helloasso_payment_state = 'PENDING';
    subscription.updated_at = new Date();
    await this.souscriptionRepo.save(subscription);
    await this.addEvent(this.dataSource.manager, subscription.id, 'CHECKOUT_CREE', {
      checkout_intent_id: checkout.id,
      nb_echeances: subscription.nb_echeances,
      total: subscription.montant_total_centimes,
      initial: initialAmount,
    });
    return {
      souscription: await this.toView(subscription.id, compteId, projectId),
      redirectUrl: checkout.redirectUrl,
    };
  }

  async confirmPayment(id: number, projectId: number, compteId: number) {
    const subscription = await this.getOwnedSubscription(id, compteId, projectId);
    if (subscription.statut === 'FINALISEE') {
      return {
        souscription: await this.toView(subscription.id, compteId, projectId),
        paiement_confirme: true,
        message: 'Inscription finalisée',
      };
    }
    if (!subscription.helloasso_checkout_intent_id) {
      throw new BadRequestException('Aucun paiement HelloAsso associé');
    }
    const checkout = await this.helloAsso.getCheckoutIntent(
      subscription.helloasso_checkout_intent_id,
    );
    const state = this.helloAsso.extractPaymentState(checkout);
    subscription.helloasso_payment_state = state;
    subscription.updated_at = new Date();
    await this.souscriptionRepo.save(subscription);
    if (this.helloAsso.isPaid(checkout)) {
      await this.finalize(subscription.id, state, checkout);
      return {
        souscription: await this.toView(subscription.id, compteId, projectId),
        paiement_confirme: true,
        message: 'Paiement confirmé, inscription activée',
      };
    }
    return {
      souscription: await this.toView(subscription.id, compteId, projectId),
      paiement_confirme: false,
      message: 'Paiement encore en cours de confirmation',
    };
  }

  async cancel(id: number, projectId: number, compteId: number) {
    const subscription = await this.getOwnedSubscription(id, compteId, projectId);
    if (['PAYEE', 'FINALISEE'].includes(subscription.statut)) {
      throw new BadRequestException('Une souscription payée ne peut pas être annulée ici');
    }
    subscription.statut = 'ANNULEE';
    subscription.canceled_at = new Date();
    subscription.updated_at = new Date();
    await this.souscriptionRepo.save(subscription);
    await this.addEvent(
      this.dataSource.manager,
      subscription.id,
      'SOUSCRIPTION_ANNULEE',
    );
    return { ok: true };
  }

  async handleHelloAssoWebhook(payload: unknown) {
    const checkoutId = this.helloAsso.extractCheckoutIntentId(payload);
    if (!checkoutId) return { ok: true, ignored: true };
    const subscription = await this.souscriptionRepo.findOne({
      where: { helloasso_checkout_intent_id: checkoutId },
    });
    if (!subscription) return { ok: true, ignored: true };
    await this.addEvent(this.dataSource.manager, subscription.id, 'WEBHOOK_RECU', {
      checkout_intent_id: checkoutId,
    });
    const checkout = await this.helloAsso.getCheckoutIntent(checkoutId);
    const state = this.helloAsso.extractPaymentState(checkout);
    subscription.helloasso_payment_state = state;
    subscription.updated_at = new Date();
    await this.souscriptionRepo.save(subscription);
    if (this.helloAsso.isPaid(checkout)) {
      await this.finalize(subscription.id, state, checkout);
    }
    return { ok: true };
  }

  private async finalize(
    subscriptionId: number,
    paymentState: string,
    checkout?: unknown,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const subscriptionRepo = manager.getRepository(SouscriptionEntity);
      const lineRepo = manager.getRepository(SouscriptionPersonneEntity);
      const lineGroupRepo = manager.getRepository(SouscriptionPersonneGroupeEntity);
      const registrationRepo = manager.getRepository(InscriptionSaisonEntity);
      const groupLinkRepo = manager.getRepository(LienGroupeEntity);
      const subscription = await subscriptionRepo.findOne({
        where: { id: subscriptionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!subscription) throw new NotFoundException('Souscription introuvable');
      if (subscription.statut === 'FINALISEE') return;

      const lines = await lineRepo.find({
        where: { souscription_id: subscription.id },
      });
      const lineIds = lines.map((line) => line.id);
      const groupLinks = lineIds.length
        ? await lineGroupRepo.find({
            where: { souscription_personne_id: In(lineIds) },
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
        const selectedGroups = groupLinks.filter(
          (link) => link.souscription_personne_id === line.id,
        );
        for (const selectedGroup of selectedGroups) {
          const existing = await groupLinkRepo.findOne({
            where: {
              groupe_id: selectedGroup.groupe_id,
              object_id: line.personne_id,
              object_type: 'rider',
            },
          });
          if (!existing) {
            await groupLinkRepo.save(
              groupLinkRepo.create({
                groupe_id: selectedGroup.groupe_id,
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
      subscription.helloasso_payment_state = paymentState;
      subscription.paid_at = subscription.paid_at ?? new Date();
      subscription.finalized_at = new Date();
      subscription.updated_at = new Date();
      subscription.error_message = null;
      await subscriptionRepo.save(subscription);
      await this.addEvent(manager, subscription.id, 'FINALISATION_TERMINEE', {
        payment_state: paymentState,
        checkout,
      });
    });
  }

  private async resolvePromo(
    rawCode: string | null | undefined,
    saisonId: number,
    projectId: number,
    lines: ValidatedLine[],
  ): Promise<PromoResolution> {
    const empty: PromoResolution = {
      entity: null,
      code: null,
      libelle: null,
      totalDiscount: 0,
      discountsByPersonId: new Map<number, number>(),
      message: null,
    };
    const code = (rawCode ?? '').trim().toUpperCase();
    if (!code) return empty;
    const promo = await this.promoRepo
      .createQueryBuilder('promo')
      .where('promo.project_id = :projectId', { projectId })
      .andWhere('promo.saison_id = :saisonId', { saisonId })
      .andWhere('LOWER(BTRIM(promo.code)) = LOWER(BTRIM(:code))', { code })
      .getOne();
    if (!promo || !promo.actif) {
      throw new BadRequestException('Code promotionnel inconnu ou inactif');
    }
    const today = new Date().toISOString().slice(0, 10);
    if (promo.date_debut && today < promo.date_debut) {
      throw new BadRequestException("Ce code promotionnel n'est pas encore disponible");
    }
    if (promo.date_fin && today > promo.date_fin) {
      throw new BadRequestException('Ce code promotionnel est expiré');
    }
    if (promo.limit_nb != null) {
      const used = await this.souscriptionRepo.count({
        where: { code_promo_id: promo.id, statut: In(['PAYEE', 'FINALISEE']) },
      });
      if (used >= promo.limit_nb) {
        throw new BadRequestException('Ce code promotionnel a atteint sa limite');
      }
    }
    const targetedLinks = await this.promoTarifRepo.find({
      where: { code_promo_id: promo.id },
    });
    const targetedTariffs = new Set(
      targetedLinks.map((link) => link.tarif_inscription_id),
    );
    const eligibleLines = targetedTariffs.size
      ? lines.filter((line) => targetedTariffs.has(line.tarif.id))
      : lines;
    if (!eligibleLines.length) {
      throw new BadRequestException("Ce code ne s'applique à aucun tarif du panier");
    }
    const eligibleTotal = eligibleLines.reduce(
      (sum, line) => sum + line.prixInitial,
      0,
    );
    if (
      promo.montant_min_centimes != null &&
      eligibleTotal < promo.montant_min_centimes
    ) {
      throw new BadRequestException(
        `Ce code nécessite un montant minimal de ${(promo.montant_min_centimes / 100).toFixed(2)} €`,
      );
    }
    let discount =
      promo.type_remise === 'POURCENTAGE'
        ? Math.round((eligibleTotal * promo.valeur) / 100)
        : promo.valeur;
    discount = Math.min(discount, eligibleTotal);
    if (promo.max_remise_centimes != null) {
      discount = Math.min(discount, promo.max_remise_centimes);
    }
    const discounts = this.distributeDiscount(eligibleLines, discount);
    return {
      entity: promo,
      code,
      libelle: promo.libelle,
      totalDiscount: discount,
      discountsByPersonId: discounts,
      message: discount > 0 ? 'Code promotionnel appliqué' : 'Code reconnu',
    };
  }

  private distributeDiscount(
    lines: ValidatedLine[],
    totalDiscount: number,
  ): Map<number, number> {
    const result = new Map<number, number>();
    if (!lines.length || totalDiscount <= 0) return result;
    const total = lines.reduce((sum, line) => sum + line.prixInitial, 0);
    let remaining = totalDiscount;
    lines.forEach((line, index) => {
      const discount =
        index === lines.length - 1
          ? remaining
          : Math.min(
              line.prixInitial,
              Math.round((totalDiscount * line.prixInitial) / total),
            );
      result.set(line.personne.id, discount);
      remaining -= discount;
    });
    return result;
  }

  private async toView(id: number, compteId: number, projectId: number) {
    const subscription = await this.getOwnedSubscription(id, compteId, projectId);
    const lines = await this.ligneRepo.find({
      where: { souscription_id: subscription.id },
      order: { id: 'ASC' },
    });
    const lineIds = lines.map((line) => line.id);
    const personIds = lines.map((line) => line.personne_id);
    const tariffIds = lines
      .map((line) => line.tarif_inscription_id)
      .filter((value): value is number => value != null);
    const groupLinks = lineIds.length
      ? await this.ligneGroupeRepo.find({
          where: { souscription_personne_id: In(lineIds) },
        })
      : [];
    const groupIds = Array.from(new Set(groupLinks.map((link) => link.groupe_id)));
    const [people, tariffs, groups] = await Promise.all([
      personIds.length ? this.personneRepo.find({ where: { id: In(personIds) } }) : [],
      tariffIds.length ? this.tarifRepo.find({ where: { id: In(tariffIds) } }) : [],
      groupIds.length ? this.groupeRepo.find({ where: { id: In(groupIds) } }) : [],
    ]);
    const peopleById = new Map(people.map((p) => [p.id, p]));
    const tariffById = new Map(tariffs.map((t) => [t.id, t]));
    const groupById = new Map(groups.map((g) => [g.id, g]));
    return {
      ...subscription,
      personnes: lines.map((line) => {
        const person = peopleById.get(line.personne_id);
        const tariff = line.tarif_inscription_id
          ? tariffById.get(line.tarif_inscription_id)
          : null;
        const lineGroups = groupLinks.filter(
          (link) => link.souscription_personne_id === line.id,
        );
        return {
          id: line.id,
          personne_id: line.personne_id,
          personne_nom: person
            ? `${person.first_name} ${person.last_name}`.trim()
            : `Personne #${line.personne_id}`,
          tarif_inscription_id: line.tarif_inscription_id,
          tarif_nom: tariff?.nom ?? '',
          groupe_ids: lineGroups.map((link) => link.groupe_id),
          groupes_noms: lineGroups.map(
            (link) => groupById.get(link.groupe_id)?.nom ?? `Groupe #${link.groupe_id}`,
          ),
          prix_initial_centimes: line.prix_initial_centimes,
          remise_centimes: line.remise_centimes,
          prix_final_centimes: line.prix_final_centimes,
          statut: line.statut,
          inscription_saison_id: line.inscription_saison_id,
        };
      }),
    };
  }

  private async getOwnedSubscription(
    id: number,
    compteId: number,
    projectId: number,
  ): Promise<SouscriptionEntity> {
    const subscription = await this.souscriptionRepo.findOne({
      where: { id: Number(id) },
    });
    if (!subscription) throw new NotFoundException(`Souscription ${id} introuvable`);
    if (
      Number(subscription.compte_id) !== Number(compteId) ||
      Number(subscription.project_id) !== Number(projectId)
    ) {
      throw new ForbiddenException('SOUSCRIPTION_HORS_COMPTE_OU_PROJET');
    }
    return subscription;
  }

  private async getOwnedPerson(
    personneId: number,
    compteId: number,
  ): Promise<PersonneEntity> {
    const personne = await this.personneRepo.findOne({
      where: { id: Number(personneId), compte: Number(compteId), archive: false },
    });
    if (!personne) throw new ForbiddenException('PERSONNE_HORS_COMPTE');
    return personne;
  }

  private async assertSaisonInProject(
    saisonId: number,
    projectId: number,
  ): Promise<SaisonEntity> {
    const saison = await this.saisonRepo.findOne({ where: { id: Number(saisonId) } });
    if (!saison) throw new NotFoundException(`Saison ${saisonId} introuvable`);
    if (Number(saison.project_id) !== Number(projectId)) {
      throw new ForbiddenException('WRONG_PROJECT');
    }
    return saison;
  }

  private async loadActiveGroupCounts(saisonId: number): Promise<GroupCountMap> {
    const rows = await this.lienGroupeRepo
      .createQueryBuilder('lien')
      .innerJoin('groupes', 'groupe', 'groupe.id = lien.groupe_id')
      .innerJoin(
        'inscription_saison',
        'inscription',
        'inscription.personne_id = lien.object_id AND inscription.saison_id = :saisonId AND inscription.active = true',
        { saisonId },
      )
      .select('lien.groupe_id', 'groupe_id')
      .addSelect('COUNT(DISTINCT lien.object_id)', 'count')
      .where('lien.object_type = :type', { type: 'rider' })
      .andWhere('groupe.saison_id = :saisonId', { saisonId })
      .groupBy('lien.groupe_id')
      .getRawMany<{ groupe_id: string; count: string }>();
    return new Map(rows.map((row) => [Number(row.groupe_id), Number(row.count)]));
  }

  private async loadPaidTarifUsage(saisonId: number): Promise<TarifUsageMap> {
    const rows = await this.ligneRepo
      .createQueryBuilder('ligne')
      .innerJoin('souscription', 's', 's.id = ligne.souscription_id')
      .select('ligne.tarif_inscription_id', 'tarif_id')
      .addSelect('COUNT(*)', 'count')
      .where('s.saison_id = :saisonId', { saisonId })
      .andWhere("s.statut IN ('PAYEE', 'FINALISEE')")
      .andWhere('ligne.tarif_inscription_id IS NOT NULL')
      .groupBy('ligne.tarif_inscription_id')
      .getRawMany<{ tarif_id: string; count: string }>();
    return new Map(rows.map((row) => [Number(row.tarif_id), Number(row.count)]));
  }

  private async loadPreviousActivePersonIds(
    previousSeasonId: number | null | undefined,
    personIds: number[],
  ): Promise<Set<number>> {
    if (!previousSeasonId || !personIds.length) return new Set<number>();
    const rows = await this.inscriptionSaisonRepo.find({
      where: {
        saison_id: previousSeasonId,
        personne_id: In(personIds),
        active: true,
      },
    });
    return new Set(rows.map((row) => row.personne_id));
  }

  private async loadPreviousGroups(
    previousSeasonId: number | null | undefined,
    personIds: number[],
  ): Promise<Map<number, number[]>> {
    if (!previousSeasonId || !personIds.length) return new Map<number, number[]>();
    const rows = await this.lienGroupeRepo
      .createQueryBuilder('lien')
      .innerJoin('groupes', 'groupe', 'groupe.id = lien.groupe_id')
      .innerJoin(
        'inscription_saison',
        'inscription',
        'inscription.personne_id = lien.object_id AND inscription.saison_id = :previousSeasonId AND inscription.active = true',
        { previousSeasonId },
      )
      .select('lien.object_id', 'personne_id')
      .addSelect('lien.groupe_id', 'groupe_id')
      .where('lien.object_type = :type', { type: 'rider' })
      .andWhere('lien.object_id IN (:...personIds)', { personIds })
      .andWhere('groupe.saison_id = :previousSeasonId', { previousSeasonId })
      .getRawMany<{ personne_id: string; groupe_id: string }>();
    const result = new Map<number, number[]>();
    for (const row of rows) {
      const id = Number(row.personne_id);
      const groups = result.get(id) ?? [];
      groups.push(Number(row.groupe_id));
      result.set(id, groups);
    }
    return result;
  }

  private groupIneligibilityReason(
    group: GroupesEntity,
    birthYear: number,
    civilAge: number,
    currentCount: number,
  ): string | null {
    if (!group.visible) return 'Groupe non public';
    const criteria = this.criteriaReason(group, birthYear, civilAge);
    if (criteria) return criteria;
    if (group.limit_nb != null && currentCount >= group.limit_nb) {
      return 'Groupe complet';
    }
    return null;
  }

  private tarifIneligibilityReason(
    tariff: TarifInscriptionEntity,
    birthYear: number,
    civilAge: number,
    isReinscription: boolean,
    currentUsage: number,
  ): string | null {
    if (!tariff.actif) return 'Tarif inactif';
    const today = new Date().toISOString().slice(0, 10);
    if (tariff.date_debut_validite && today < tariff.date_debut_validite) {
      return 'Tarif pas encore disponible';
    }
    if (tariff.date_fin_validite && today > tariff.date_fin_validite) {
      return 'Tarif expiré';
    }
    if (tariff.reinscription && !isReinscription) {
      return 'Réservé aux réinscriptions';
    }
    const criteria = this.criteriaReason(tariff, birthYear, civilAge);
    if (criteria) return criteria;
    if (tariff.limit_nb != null && currentUsage >= tariff.limit_nb) {
      return 'Tarif épuisé';
    }
    return null;
  }

  private criteriaReason(
    criteria: {
      age_min?: number | null;
      age_max?: number | null;
      naissance_avant?: number | null;
      naissance_apres?: number | null;
    },
    birthYear: number,
    civilAge: number,
  ): string | null {
    if (criteria.age_min != null && civilAge < criteria.age_min) {
      return `Âge minimum : ${criteria.age_min} ans dans l'année`;
    }
    if (criteria.age_max != null && civilAge > criteria.age_max) {
      return `Âge maximum : ${criteria.age_max} ans dans l'année`;
    }
    if (criteria.naissance_avant != null && birthYear < criteria.naissance_avant) {
      return `Né(e) au plus tôt en ${criteria.naissance_avant}`;
    }
    if (criteria.naissance_apres != null && birthYear > criteria.naissance_apres) {
      return `Né(e) au plus tard en ${criteria.naissance_apres}`;
    }
    return null;
  }

  private civilAge(dateNaissance: string, seasonStart: string): number {
    return Number(seasonStart.slice(0, 4)) - this.birthYear(dateNaissance);
  }

  private birthYear(dateNaissance: string): number {
    return Number(String(dateNaissance).slice(0, 4));
  }

  private findContact(contacts: Contact[], type: 'EMAIL' | 'PHONE'): string | null {
    return (
      contacts.find(
        (contact) =>
          contact.contact_type?.trim().toUpperCase() === type &&
          !!contact.contact_value?.trim(),
      )?.contact_value?.trim() ?? null
    );
  }

  private getMissingPersonFields(
    personne: PersonneEntity,
    email: string | null,
    telephone: string | null,
  ): string[] {
    const missing: string[] = [];
    if (!personne.first_name?.trim()) missing.push('prénom');
    if (!personne.last_name?.trim()) missing.push('nom');
    if (!personne.date_naissance) missing.push('date de naissance');
    if (!personne.address?.trim()) missing.push('adresse');
    if (!email) missing.push('email');
    if (!telephone) missing.push('téléphone');
    return missing;
  }

  private async upsertContact(
    personId: number,
    type: 'EMAIL' | 'PHONE',
    value: string,
  ): Promise<void> {
    let contact = await this.contactRepo
      .createQueryBuilder('contact')
      .where('contact.object_type = :objectType', { objectType: 'rider' })
      .andWhere('contact.object_id = :personId', { personId })
      .andWhere('UPPER(contact.contact_type) = :type', { type })
      .orderBy('contact.pref', 'DESC')
      .getOne();
    if (!contact) {
      contact = this.contactRepo.create({
        object_type: 'rider',
        object_id: personId,
        contact_type: type,
        contact_value: value,
        diffusion: false,
        contact_list: 'liste_contact',
        info: null,
        pref: true,
      });
    } else {
      contact.contact_value = value;
      contact.pref = true;
    }
    await this.contactRepo.save(contact);
  }

  private async addEvent(
    manager: EntityManager,
    subscriptionId: number,
    type: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    const repo = manager.getRepository(SouscriptionEvenementEntity);
    await repo.save(
      repo.create({
        souscription_id: subscriptionId,
        type_evenement: type,
        details: details ?? null,
      }),
    );
  }

  private findDuplicates(values: number[]): number[] {
    const seen = new Set<number>();
    const duplicates = new Set<number>();
    for (const value of values) {
      if (seen.has(value)) duplicates.add(value);
      seen.add(value);
    }
    return Array.from(duplicates);
  }
}

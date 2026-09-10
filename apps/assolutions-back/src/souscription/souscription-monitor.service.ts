import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { CompteEntity } from '../compte/compte.entity';
import { ExigenceDossierEntity } from '../exigence-dossier/exigence-dossier.entity';
import { ReponseExigenceDossierEntity } from '../exigence-dossier/reponse-exigence-dossier.entity';
import { FluxFinancierEntity } from '../flux_financier/flux_financier.entity';
import { GroupesEntity } from '../groupes/groupes.entity';
import { InscriptionSaisonEntity } from '../inscription_saison/inscription_saison.entity';
import { OperationEntity } from '../operation/operation.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { TarifInscriptionEntity } from '../tarif_inscription/tarif_inscription.entity';
import { SouscriptionEntity } from './souscription.entity';
import { SouscriptionEvenementEntity } from './souscription-evenement.entity';
import { SouscriptionPersonneEntity } from './souscription-personne.entity';
import { SouscriptionPersonneGroupeEntity } from './souscription-personne-groupe.entity';

export type SouscriptionMonitorFilters = {
  search?: string;
  statut?: string;
  saisonId?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

@Injectable()
export class SouscriptionMonitorService {
  constructor(
    @InjectRepository(SouscriptionEntity)
    private readonly subscriptions: Repository<SouscriptionEntity>,
    @InjectRepository(SouscriptionPersonneEntity)
    private readonly lines: Repository<SouscriptionPersonneEntity>,
    @InjectRepository(SouscriptionPersonneGroupeEntity)
    private readonly lineGroups: Repository<SouscriptionPersonneGroupeEntity>,
    @InjectRepository(SouscriptionEvenementEntity)
    private readonly events: Repository<SouscriptionEvenementEntity>,
    @InjectRepository(PersonneEntity)
    private readonly people: Repository<PersonneEntity>,
    @InjectRepository(CompteEntity)
    private readonly accounts: Repository<CompteEntity>,
    @InjectRepository(SaisonEntity)
    private readonly seasons: Repository<SaisonEntity>,
    @InjectRepository(GroupesEntity)
    private readonly groups: Repository<GroupesEntity>,
    @InjectRepository(TarifInscriptionEntity)
    private readonly tariffs: Repository<TarifInscriptionEntity>,
    @InjectRepository(InscriptionSaisonEntity)
    private readonly registrations: Repository<InscriptionSaisonEntity>,
    @InjectRepository(FluxFinancierEntity)
    private readonly financialFlows: Repository<FluxFinancierEntity>,
    @InjectRepository(OperationEntity)
    private readonly operations: Repository<OperationEntity>,
    @InjectRepository(ExigenceDossierEntity)
    private readonly requirements: Repository<ExigenceDossierEntity>,
    @InjectRepository(ReponseExigenceDossierEntity)
    private readonly requirementAnswers: Repository<ReponseExigenceDossierEntity>,
  ) {}

  async list(projectId: number, filters: SouscriptionMonitorFilters) {
    const query = this.subscriptions
      .createQueryBuilder('s')
      .where('s.project_id = :projectId', { projectId })
      .orderBy('s.created_at', 'DESC')
      .addOrderBy('s.id', 'DESC')
      .take(300);

    if (filters.statut && filters.statut !== 'ALL') {
      query.andWhere('s.statut = :statut', { statut: filters.statut });
    }
    if (filters.saisonId) {
      query.andWhere('s.saison_id = :saisonId', { saisonId: filters.saisonId });
    }
    if (filters.dateFrom) {
      query.andWhere('s.created_at >= :dateFrom', {
        dateFrom: `${filters.dateFrom}T00:00:00`,
      });
    }
    if (filters.dateTo) {
      query.andWhere('s.created_at < (:dateTo::date + INTERVAL \'1 day\')', {
        dateTo: filters.dateTo,
      });
    }

    const subscriptions = await query.getMany();
    if (!subscriptions.length) return [];

    const subscriptionIds = subscriptions.map((item) => item.id);
    const accountIds = Array.from(new Set(subscriptions.map((item) => item.compte_id)));
    const seasonIds = Array.from(new Set(subscriptions.map((item) => item.saison_id)));
    const [lines, accounts, seasons] = await Promise.all([
      this.lines.find({ where: { souscription_id: In(subscriptionIds) } }),
      this.accounts.find({ where: { id: In(accountIds) } }),
      this.seasons.find({ where: { id: In(seasonIds) } }),
    ]);
    const personIds = Array.from(new Set(lines.map((line) => line.personne_id)));
    const people = personIds.length
      ? await this.people.find({ where: { id: In(personIds) } })
      : [];

    const accountById = new Map(accounts.map((item) => [item.id, item]));
    const seasonById = new Map(seasons.map((item) => [item.id, item]));
    const personById = new Map(people.map((item) => [item.id, item]));
    const linesBySubscription = new Map<number, SouscriptionPersonneEntity[]>();
    for (const line of lines) {
      const current = linesBySubscription.get(line.souscription_id) ?? [];
      current.push(line);
      linesBySubscription.set(line.souscription_id, current);
    }

    const term = String(filters.search ?? '').trim().toLocaleLowerCase('fr');
    const views = subscriptions.map((subscription) => {
      const subscriptionLines = linesBySubscription.get(subscription.id) ?? [];
      const names = subscriptionLines.map((line) => {
        const person = personById.get(line.personne_id);
        return person
          ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim()
          : `Personne #${line.personne_id}`;
      });
      const account = accountById.get(subscription.compte_id);
      const warnings = this.inconsistencies(subscription, subscriptionLines);

      return {
        id: subscription.id,
        statut: subscription.statut,
        payment_state: subscription.helloasso_payment_state,
        project_id: subscription.project_id,
        saison_id: subscription.saison_id,
        saison_nom: seasonById.get(subscription.saison_id)?.nom ?? `Saison #${subscription.saison_id}`,
        compte_id: subscription.compte_id,
        compte_login: account?.login ?? null,
        payeur: [subscription.payeur_prenom, subscription.payeur_nom].filter(Boolean).join(' ').trim() || null,
        payeur_email: subscription.payeur_email,
        personnes: names,
        personne_ids: subscriptionLines.map((line) => line.personne_id),
        montant_total_centimes: subscription.montant_total_centimes,
        nb_echeances: subscription.nb_echeances,
        checkout_intent_id: subscription.helloasso_checkout_intent_id,
        order_id: subscription.helloasso_order_id,
        created_at: subscription.created_at,
        updated_at: subscription.updated_at,
        paid_at: subscription.paid_at,
        finalized_at: subscription.finalized_at,
        canceled_at: subscription.canceled_at,
        error_message: subscription.error_message,
        dossier_complet: subscriptionLines.length > 0 && subscriptionLines.every((line) => line.dossier_complet),
        warnings,
      };
    });

    if (!term) return views;

    return views.filter((item) =>
      [
        String(item.id),
        String(item.compte_id),
        item.compte_login,
        item.payeur,
        item.payeur_email,
        item.saison_nom,
        item.statut,
        item.payment_state,
        ...item.personnes,
        ...item.personne_ids.map(String),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('fr').includes(term)),
    );
  }

  async detail(id: number, projectId: number) {
    const subscription = await this.subscriptions.findOne({
      where: { id, project_id: projectId },
    });
    if (!subscription) throw new NotFoundException('Souscription introuvable');

    const [lines, events, account, season, flow] = await Promise.all([
      this.lines.find({ where: { souscription_id: id }, order: { id: 'ASC' } }),
      this.events.find({ where: { souscription_id: id }, order: { created_at: 'ASC' } }),
      this.accounts.findOne({ where: { id: subscription.compte_id } }),
      this.seasons.findOne({ where: { id: subscription.saison_id } }),
      this.financialFlows.findOne({
        where: { project_id: projectId, origine: `SOUSCRIPTION:${id}` },
      }),
    ]);

    const lineIds = lines.map((line) => line.id);
    const personIds = Array.from(new Set(lines.map((line) => line.personne_id)));
    const tariffIds = Array.from(
      new Set(lines.map((line) => Number(line.tarif_inscription_id ?? 0)).filter(Boolean)),
    );
    const registrationIds = Array.from(
      new Set(lines.map((line) => Number(line.inscription_saison_id ?? 0)).filter(Boolean)),
    );

    const [lineGroups, people, tariffs, registrations, answers, operations] = await Promise.all([
      lineIds.length
        ? this.lineGroups.find({ where: { souscription_personne_id: In(lineIds) } })
        : Promise.resolve([]),
      personIds.length
        ? this.people.find({ where: { id: In(personIds) } })
        : Promise.resolve([]),
      tariffIds.length
        ? this.tariffs.find({ where: { id: In(tariffIds) } })
        : Promise.resolve([]),
      registrationIds.length
        ? this.registrations.find({ where: { id: In(registrationIds) } })
        : Promise.resolve([]),
      lineIds.length
        ? this.requirementAnswers.find({ where: { souscription_personne_id: In(lineIds) } })
        : Promise.resolve([]),
      flow
        ? this.operations.find({ where: { flux_financier_id: flow.id }, order: { id: 'ASC' } })
        : Promise.resolve([]),
    ]);

    const groupIds = Array.from(new Set(lineGroups.map((item) => item.groupe_id)));
    const requirementIds = Array.from(new Set(answers.map((item) => item.exigence_id)));
    const [groups, requirements] = await Promise.all([
      groupIds.length
        ? this.groups.find({ where: { id: In(groupIds) } })
        : Promise.resolve([]),
      requirementIds.length
        ? this.requirements.find({ where: { id: In(requirementIds) } })
        : Promise.resolve([]),
    ]);

    const personById = new Map(people.map((item) => [item.id, item]));
    const tariffById = new Map(tariffs.map((item) => [item.id, item]));
    const groupById = new Map(groups.map((item) => [item.id, item]));
    const registrationById = new Map(registrations.map((item) => [item.id, item]));
    const requirementById = new Map(requirements.map((item) => [item.id, item]));
    const groupsByLine = new Map<number, SouscriptionPersonneGroupeEntity[]>();
    for (const item of lineGroups) {
      const current = groupsByLine.get(item.souscription_personne_id) ?? [];
      current.push(item);
      groupsByLine.set(item.souscription_personne_id, current);
    }
    const answersByLine = new Map<number, ReponseExigenceDossierEntity[]>();
    for (const answer of answers) {
      const lineId = Number(answer.souscription_personne_id ?? 0);
      if (!lineId) continue;
      const current = answersByLine.get(lineId) ?? [];
      current.push(answer);
      answersByLine.set(lineId, current);
    }

    const personViews = lines.map((line) => {
      const person = personById.get(line.personne_id);
      const lineAnswers = answersByLine.get(line.id) ?? [];
      const registration = line.inscription_saison_id
        ? registrationById.get(line.inscription_saison_id)
        : null;

      return {
        id: line.id,
        personne_id: line.personne_id,
        personne_nom: person
          ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim()
          : `Personne #${line.personne_id}`,
        statut: line.statut,
        type_licence: line.type_licence,
        dossier_complet: line.dossier_complet,
        informations_validees_at: line.informations_validees_at,
        tarif: line.tarif_inscription_id
          ? {
              id: line.tarif_inscription_id,
              nom: tariffById.get(line.tarif_inscription_id)?.nom ?? `Tarif #${line.tarif_inscription_id}`,
            }
          : null,
        groupes: (groupsByLine.get(line.id) ?? []).map((choice) => ({
          id: choice.groupe_id,
          nom: groupById.get(choice.groupe_id)?.nom ?? `Groupe #${choice.groupe_id}`,
        })),
        prix_initial_centimes: line.prix_initial_centimes,
        remise_centimes: line.remise_centimes,
        prix_final_centimes: line.prix_final_centimes,
        inscription_saison_id: line.inscription_saison_id,
        inscription_active: registration?.active ?? null,
        exigences: lineAnswers.map((answer) => {
          const requirement = requirementById.get(answer.exigence_id);
          return {
            id: answer.id,
            exigence_id: answer.exigence_id,
            libelle: requirement?.libelle ?? `Exigence #${answer.exigence_id}`,
            type_exigence: requirement?.type_exigence ?? null,
            obligatoire: requirement?.obligatoire ?? null,
            bloquante: requirement?.bloquante ?? null,
            repondue_at: answer.date_reponse,
            document_id: answer.document_id,
            has_value:
              answer.valeur_boolean !== null ||
              !!answer.valeur_texte ||
              !!answer.valeur_date ||
              !!answer.document_id ||
              !!answer.texte_accepte,
          };
        }),
      };
    });

    const timeline = [
      {
        type: 'SOUSCRIPTION_CREEE',
        label: 'Souscription créée',
        created_at: subscription.created_at,
        level: 'INFO',
        details: null,
      },
      ...events.map((event) => ({
        type: event.type_evenement,
        label: this.eventLabel(event.type_evenement),
        created_at: event.created_at,
        level: this.eventLevel(event.type_evenement),
        details: this.sanitizeDetails(event.details),
      })),
      ...(subscription.paid_at
        ? [
            {
              type: 'PAIEMENT_CONFIRME',
              label: 'Paiement confirmé',
              created_at: subscription.paid_at,
              level: 'SUCCESS',
              details: null,
            },
          ]
        : []),
      ...(subscription.finalized_at
        ? [
            {
              type: 'FINALISATION_DATE',
              label: 'Finalisation métier enregistrée',
              created_at: subscription.finalized_at,
              level: 'SUCCESS',
              details: null,
            },
          ]
        : []),
      ...(subscription.canceled_at
        ? [
            {
              type: 'ANNULATION_DATE',
              label: 'Souscription annulée',
              created_at: subscription.canceled_at,
              level: 'WARNING',
              details: null,
            },
          ]
        : []),
      ...(subscription.error_message
        ? [
            {
              type: 'ERREUR',
              label: subscription.error_message,
              created_at: subscription.updated_at ?? subscription.created_at,
              level: 'ERROR',
              details: null,
            },
          ]
        : []),
    ].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    return {
      souscription: {
        ...subscription,
        helloasso_redirect_url: undefined,
      },
      compte: account ? { id: account.id, login: account.login } : null,
      saison: season ? { id: season.id, nom: season.nom } : null,
      personnes: personViews,
      timeline,
      finance: flow
        ? {
            flux_id: flow.id,
            origine: flow.origine,
            montant: flow.montant,
            date: flow.date,
            operations: operations.map((operation) => ({
              id: operation.id,
              solde: operation.solde,
              date_operation: operation.date_operation,
              paiement_execute: operation.paiement_execute,
              libelle_bancaire: operation.libelle_bancaire,
            })),
          }
        : null,
      warnings: this.inconsistencies(subscription, lines, !!flow),
    };
  }

  private inconsistencies(
    subscription: SouscriptionEntity,
    lines: SouscriptionPersonneEntity[],
    hasFinancialFlow?: boolean,
  ): string[] {
    const warnings: string[] = [];
    if (!lines.length) warnings.push('Aucune personne n’est rattachée à cette souscription.');
    if (subscription.error_message) warnings.push(subscription.error_message);
    if (
      subscription.statut === 'EN_ATTENTE_PAIEMENT' &&
      !subscription.helloasso_checkout_intent_id
    ) {
      warnings.push('En attente de paiement sans checkout HelloAsso associé.');
    }
    if (subscription.statut === 'FINALISEE' && !subscription.finalized_at) {
      warnings.push('Souscription finalisée sans date de finalisation.');
    }
    if (
      subscription.statut === 'FINALISEE' &&
      lines.some((line) => !line.inscription_saison_id)
    ) {
      warnings.push('Au moins une personne finalisée n’a pas d’inscription saison associée.');
    }
    if (subscription.statut === 'FINALISEE' && hasFinancialFlow === false) {
      warnings.push('Souscription finalisée sans flux financier généré.');
    }
    return warnings;
  }

  private eventLabel(type: string): string {
    const labels: Record<string, string> = {
      BROUILLON_ENREGISTRE: 'Brouillon enregistré',
      CHECKOUT_CREE: 'Checkout HelloAsso créé',
      FINALISATION_TERMINEE: 'Finalisation terminée',
      PAIEMENT_SIMULE_OK: 'Paiement simulé validé',
      PAIEMENT_SIMULE_KO: 'Paiement simulé en échec',
      DOSSIER_VALIDE: 'Dossier validé',
    };
    return labels[type] ?? type.replace(/_/g, ' ').toLowerCase();
  }

  private eventLevel(type: string): 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' {
    const normalized = String(type ?? '').toUpperCase();
    if (normalized.includes('ERREUR') || normalized.includes('ECHEC') || normalized.includes('KO')) {
      return 'ERROR';
    }
    if (normalized.includes('ANNU') || normalized.includes('ATTENTE')) return 'WARNING';
    if (normalized.includes('FINAL') || normalized.includes('PAYE') || normalized.includes('VALIDE')) {
      return 'SUCCESS';
    }
    return 'INFO';
  }

  private sanitizeDetails(value: unknown): unknown {
    if (value == null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((item) => this.sanitizeDetails(item));

    const blocked = ['token', 'secret', 'password', 'authorization', 'cookie'];
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
      (result, [key, entry]) => {
        if (blocked.some((word) => key.toLocaleLowerCase('fr').includes(word))) return result;
        result[key] = this.sanitizeDetails(entry);
        return result;
      },
      {},
    );
  }
}

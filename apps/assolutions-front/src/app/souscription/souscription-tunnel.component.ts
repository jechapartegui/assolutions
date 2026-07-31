import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CompleteSouscriptionPersonneDto,
  SaveSouscriptionDto,
  SouscriptionContexte,
  SouscriptionGroupeOption,
  SouscriptionPersonneContexte,
  SouscriptionTarifOption,
  SouscriptionView,
} from '@shared/index';

import { ErrorService } from '../../services/error.service';
import { SouscriptionApiService } from '../../services/souscription-api.service';
import { AppStore } from '../app.store';

type PersonChoice = {
  groupIds: number[];
  tariffId: number | null;
};

@Component({
  standalone: false,
  selector: 'app-souscription-tunnel',
  templateUrl: './souscription-tunnel.component.html',
  styleUrls: ['./souscription-tunnel.component.css'],
})
export class SouscriptionTunnelComponent implements OnInit {
  context: SouscriptionContexte | null = null;
  choices: Record<number, PersonChoice> = {};
  selectedPersonIds = new Set<number>();
  payeurPersonId: number | null = null;
  installments = 1;
  promoCode = '';
  promoMessage = '';
  promoDiscount = 0;
  step = 1;
  loading = false;
  action = '';
  draft: SouscriptionView | null = null;
  returnSubscription: SouscriptionView | null = null;
  returnMessage = '';
  returnConfirmed = false;
  isReturnMode = false;

  private readonly money = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  });

  constructor(
    private readonly api: SouscriptionApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly appStore: AppStore,
  ) {}

  async ngOnInit(): Promise<void> {
    if (!this.appStore.isLoggedIn()) {
      await this.router.navigate(['/login']);
      return;
    }

    const sid = Number(this.route.snapshot.queryParamMap.get('sid'));
    this.isReturnMode = this.router.url.startsWith('/souscription/retour');

    if (this.isReturnMode && sid > 0) {
      await this.confirmReturn(sid);
      return;
    }

    await this.loadContext();
  }

  get selectedPeople(): SouscriptionPersonneContexte[] {
    return (this.context?.personnes ?? []).filter((person) =>
      this.selectedPersonIds.has(person.id),
    );
  }

  get seasonId(): number {
    return Number(this.context?.saison.id ?? this.appStore.saison_active_id());
  }

  togglePerson(person: SouscriptionPersonneContexte): void {
    if (this.selectedPersonIds.has(person.id)) {
      this.selectedPersonIds.delete(person.id);
      delete this.choices[person.id];
      if (this.payeurPersonId === person.id) {
        this.payeurPersonId = this.selectedPeople[0]?.id ?? null;
      }
      return;
    }

    this.selectedPersonIds.add(person.id);
    const preferred =
      person.groupes.find((group) => group.par_defaut && group.eligible) ??
      person.groupes.find((group) => group.eligible) ??
      null;

    this.choices[person.id] = {
      groupIds: preferred ? [preferred.id] : [],
      tariffId: null,
    };
    this.ensureCompatibleTariff(person);
    this.payeurPersonId ??= person.id;
  }

  isSelected(personId: number): boolean {
    return this.selectedPersonIds.has(personId);
  }

  choice(personId: number): PersonChoice {
    return (this.choices[personId] ??= { groupIds: [], tariffId: null });
  }

  toggleGroup(
    person: SouscriptionPersonneContexte,
    group: SouscriptionGroupeOption,
  ): void {
    if (!group.eligible) return;
    const choice = this.choice(person.id);
    const ids = new Set(choice.groupIds);
    ids.has(group.id) ? ids.delete(group.id) : ids.add(group.id);
    choice.groupIds = Array.from(ids);
    this.ensureCompatibleTariff(person);
  }

  isGroupSelected(personId: number, groupId: number): boolean {
    return this.choice(personId).groupIds.includes(groupId);
  }

  compatibleTariffs(person: SouscriptionPersonneContexte): SouscriptionTarifOption[] {
    const selectedGroups = this.choice(person.id).groupIds;
    return person.tarifs
      .filter((tariff) => tariff.eligible)
      .filter(
        (tariff) =>
          tariff.general ||
          selectedGroups.every((groupId) => tariff.groupe_ids.includes(groupId)),
      )
      .sort((a, b) => {
        if (a.general !== b.general) return a.general ? -1 : 1;
        return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
      });
  }

  selectTariff(person: SouscriptionPersonneContexte, tariffId: number): void {
    this.choice(person.id).tariffId = Number(tariffId);
    this.installments = Math.min(this.installments, this.maxInstallments);
    this.clearPromoResult();
  }

  get maxInstallments(): number {
    const maxima = this.selectedPeople
      .map((person) => {
        const tariffId = this.choice(person.id).tariffId;
        return person.tarifs.find((tariff) => tariff.id === tariffId)
          ?.paiement_plusieurs_fois;
      })
      .filter((value): value is number => Number.isFinite(value));
    return maxima.length ? Math.min(...maxima) : 1;
  }

  get initialTotal(): number {
    return this.selectedPeople.reduce((sum, person) => {
      const tariffId = this.choice(person.id).tariffId;
      const tariff = person.tarifs.find((item) => item.id === tariffId);
      return sum + Number(tariff?.prix_centimes ?? 0);
    }, 0);
  }

  get finalTotal(): number {
    return Math.max(0, this.initialTotal - this.promoDiscount);
  }

  canContinue(): boolean {
    if (this.step === 1) {
      return (
        this.selectedPeople.length > 0 &&
        this.selectedPeople.every((person) => person.informations_completes)
      );
    }
    if (this.step === 2) {
      return this.selectedPeople.every(
        (person) => this.choice(person.id).groupIds.length > 0,
      );
    }
    if (this.step === 3) {
      return this.selectedPeople.every(
        (person) => this.choice(person.id).tariffId != null,
      );
    }
    return true;
  }

  next(): void {
    if (!this.canContinue()) return;
    this.step = Math.min(4, this.step + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  previous(): void {
    this.step = Math.max(1, this.step - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async savePerson(person: SouscriptionPersonneContexte): Promise<void> {
    const dto: CompleteSouscriptionPersonneDto = {
      first_name: person.first_name,
      last_name: person.last_name,
      date_naissance: person.date_naissance,
      address: person.address,
      email: person.email ?? '',
      telephone: person.telephone ?? '',
    };

    await this.run('Mise à jour des informations', async () => {
      await this.api.completePerson(person.id, dto);
      await this.loadContext(true);
    });
  }

  async validatePromo(): Promise<void> {
    if (!this.promoCode.trim()) {
      this.clearPromoResult();
      return;
    }
    await this.saveDraft();
  }

  async saveDraft(): Promise<SouscriptionView | null> {
    if (!this.payeurPersonId) return null;
    const dto: SaveSouscriptionDto = {
      saison_id: this.seasonId,
      payeur_personne_id: this.payeurPersonId,
      nb_echeances: this.installments,
      code_promo: this.promoCode.trim() || null,
      personnes: this.selectedPeople.map((person) => ({
        personne_id: person.id,
        groupe_ids: [...this.choice(person.id).groupIds],
        tarif_inscription_id: Number(this.choice(person.id).tariffId),
      })),
    };

    let saved: SouscriptionView | null = null;
    await this.run('Enregistrement du panier', async () => {
      saved = await this.api.saveDraft(dto);
      this.draft = saved;
      this.promoDiscount = saved.montant_remise_centimes;
      this.promoMessage = saved.code_promo_applique
        ? `Code ${saved.code_promo_applique} appliqué`
        : '';
    });
    return saved;
  }

  async pay(): Promise<void> {
    const draft = await this.saveDraft();
    if (!draft) return;

    await this.run('Ouverture du paiement HelloAsso', async () => {
      const checkout = await this.api.checkout(draft.id);
      this.draft = checkout.souscription;
      if (checkout.redirectUrl) {
        window.location.assign(checkout.redirectUrl);
      } else {
        this.returnSubscription = checkout.souscription;
        this.returnConfirmed = true;
        this.returnMessage = 'Inscription finalisée sans paiement';
        this.isReturnMode = true;
      }
    });
  }

  formatMoney(centimes: number): string {
    return this.money.format(Number(centimes ?? 0) / 100);
  }

  tariffFor(person: SouscriptionPersonneContexte): SouscriptionTarifOption | null {
    const id = this.choice(person.id).tariffId;
    return person.tarifs.find((tariff) => tariff.id === id) ?? null;
  }

  groupNames(person: SouscriptionPersonneContexte): string[] {
    const ids = new Set(this.choice(person.id).groupIds);
    return person.groupes
      .filter((group) => ids.has(group.id))
      .map((group) => group.nom);
  }

  private async loadContext(preserveSelection = false): Promise<void> {
    const selected = new Set(this.selectedPersonIds);
    const oldChoices = structuredClone(this.choices);
    const oldPayer = this.payeurPersonId;

    await this.run('Chargement du tunnel', async () => {
      this.context = await this.api.context(Number(this.appStore.saison_active_id()));
      this.draft = this.context.brouillon ?? null;
      if (preserveSelection) {
        this.selectedPersonIds = selected;
        this.choices = oldChoices;
        this.payeurPersonId = oldPayer;
      } else if (this.draft) {
        this.restoreDraft(this.draft);
      }
    });
  }

  private restoreDraft(draft: SouscriptionView): void {
    this.selectedPersonIds.clear();
    this.choices = {};
    draft.personnes.forEach((line) => {
      this.selectedPersonIds.add(line.personne_id);
      this.choices[line.personne_id] = {
        groupIds: [...line.groupe_ids],
        tariffId: line.tarif_inscription_id,
      };
    });
    this.payeurPersonId = draft.payeur_personne_id;
    this.installments = draft.nb_echeances;
    this.promoCode = draft.code_promo_applique ?? '';
    this.promoDiscount = draft.montant_remise_centimes;
  }

  private ensureCompatibleTariff(person: SouscriptionPersonneContexte): void {
    const compatible = this.compatibleTariffs(person);
    const current = this.choice(person.id).tariffId;
    if (!compatible.some((tariff) => tariff.id === current)) {
      this.choice(person.id).tariffId = compatible[0]?.id ?? null;
    }
    this.installments = Math.min(this.installments, this.maxInstallments);
    this.clearPromoResult();
  }

  private clearPromoResult(): void {
    this.promoMessage = '';
    this.promoDiscount = 0;
  }

  private async confirmReturn(id: number): Promise<void> {
    await this.run('Confirmation du paiement', async () => {
      const result = await this.api.confirm(id);
      this.returnSubscription = result.souscription;
      this.returnConfirmed = result.paiement_confirme;
      this.returnMessage = result.message;
    });
  }

  private async run(label: string, action: () => Promise<void>): Promise<void> {
    this.loading = true;
    this.action = label;
    try {
      await action();
    } catch (error) {
      ErrorService.instance.emitChange(
        ErrorService.instance.CreateError(label, error),
      );
    } finally {
      this.loading = false;
      this.action = '';
    }
  }
}

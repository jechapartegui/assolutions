import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AdminSaveSouscriptionDto,
  DossierPersonneEvaluation,
  EvaluationPreuveMedicale,
  ExigenceEvaluation,
  SaveSouscriptionDto,
  SouscriptionContexte,
  SouscriptionGroupeOption,
  SouscriptionPersonneContexte,
  SouscriptionTarifOption,
  SouscriptionView,
  TypeLicence,
} from '@shared/index';

import { environment } from '../../environments/environment';
import { DossierPersonneApiService } from '../../services/dossier-personne-api.service';
import { ErrorService } from '../../services/error.service';
import { SouscriptionApiService } from '../../services/souscription-api.service';
import { AppStore } from '../app.store';

type PersonChoice = {
  groupIds: number[];
  tariffId: number | null;
  licenceType: TypeLicence;
};

type PayerMode = number | 'OTHER';

type StoredTunnelState = {
  selectedPersonIds: number[];
  choices: Record<number, PersonChoice>;
  payerMode: PayerMode | null;
  payerFirstName: string;
  payerLastName: string;
  payerEmail: string;
  step: number;
};

@Component({
  standalone: false,
  selector: 'app-souscription-tunnel',
  templateUrl: './souscription-tunnel.component.html',
  styleUrls: ['./souscription-tunnel.component.css'],
})
export class SouscriptionTunnelComponent implements OnInit {
  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLElement>;

  private readonly storageKey = 'assolutions.souscription.tunnel';

  context: SouscriptionContexte | null = null;
  choices: Record<number, PersonChoice> = {};
  selectedPersonIds = new Set<number>();
  dossiers: Record<number, DossierPersonneEvaluation> = {};
  medical: Record<number, EvaluationPreuveMedicale> = {};

  payerMode: PayerMode | null = null;
  payerFirstName = '';
  payerLastName = '';
  payerEmail = '';
  installments = 1;
  promoCode = '';
  promoMessage = '';
  promoError = '';
  promoDiscount = 0;
  step = 1;
  loading = false;
  action = '';
  draft: SouscriptionView | null = null;
  returnSubscription: SouscriptionView | null = null;
  returnMessage = '';
  returnConfirmed = false;
  isReturnMode = false;

  adminPersonId = 0;
  adminAccountId = 0;

  readonly isLocal =
    environment.environment === 'dev' || environment.apiUrl.startsWith('/');

  private readonly money = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  });

  constructor(
    private readonly api: SouscriptionApiService,
    private readonly dossierApi: DossierPersonneApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly appStore: AppStore,
  ) {}

  get isAdminMode(): boolean {
    return this.adminPersonId > 0 && this.adminAccountId > 0;
  }

  async ngOnInit(): Promise<void> {
    if (!this.appStore.isLoggedIn()) {
      await this.router.navigate(['/login']);
      return;
    }

    const sid = Number(this.route.snapshot.queryParamMap.get('sid'));
    this.adminPersonId = Number(
      this.route.snapshot.queryParamMap.get('adminPersonId') ?? 0,
    );
    this.isReturnMode = this.router.url.startsWith('/souscription/retour');
    if (this.isReturnMode && sid > 0) {
      await this.confirmReturn(sid);
      return;
    }

    await this.loadContext();
    this.restoreStoredState();

    if (this.adminPersonId > 0) {
      const person = this.context?.personnes.find(
        (item) => item.id === this.adminPersonId,
      );
      if (person && !person.inscription_active) {
        this.selectedPersonIds.add(person.id);
        this.choices[person.id] ??= this.emptyChoice();
        this.payerMode = person.id;
        this.onPayerModeChange();
      }
    }

    await this.loadSelectedBasicStatuses();
  }

  get selectedPeople(): SouscriptionPersonneContexte[] {
    return (this.context?.personnes ?? []).filter((person) =>
      this.selectedPersonIds.has(person.id),
    );
  }

  get seasonId(): number {
    return Number(this.context?.saison.id ?? this.appStore.saison_active_id());
  }

  async togglePerson(person: SouscriptionPersonneContexte): Promise<void> {
    if (person.inscription_active) return;

    if (this.selectedPersonIds.has(person.id)) {
      this.selectedPersonIds.delete(person.id);
      delete this.choices[person.id];
      delete this.dossiers[person.id];
      delete this.medical[person.id];
      if (this.payerMode === person.id) {
        this.payerMode = this.selectedPeople[0]?.id ?? 'OTHER';
        this.onPayerModeChange();
      }
      this.storeState();
      return;
    }

    this.selectedPersonIds.add(person.id);
    this.choices[person.id] = this.emptyChoice();
    if (this.payerMode == null) {
      this.payerMode = person.id;
      this.onPayerModeChange();
    }
    await this.loadBasicPersonStatus(person);
    this.storeState();
  }

  isSelected(personId: number): boolean {
    return this.selectedPersonIds.has(personId);
  }

  choice(personId: number): PersonChoice {
    return (this.choices[personId] ??= this.emptyChoice());
  }

  eligibleGroups(person: SouscriptionPersonneContexte): SouscriptionGroupeOption[] {
    return person.groupes
      .filter((group) => group.visible && group.eligible && !group.complet)
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }

  hiddenGroupCount(person: SouscriptionPersonneContexte): number {
    return Math.max(0, person.groupes.length - this.eligibleGroups(person).length);
  }

  toggleGroup(
    person: SouscriptionPersonneContexte,
    group: SouscriptionGroupeOption,
  ): void {
    if (!group.eligible || group.complet) return;
    const current = this.choice(person.id);
    const ids = new Set(current.groupIds);
    ids.has(group.id) ? ids.delete(group.id) : ids.add(group.id);
    current.groupIds = Array.from(ids);
    this.ensureCompatibleTariff(person);
    this.storeState();
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
    this.storeState();
  }

  async selectLicence(
    person: SouscriptionPersonneContexte,
    type: TypeLicence,
  ): Promise<void> {
    this.choice(person.id).licenceType = type;
    await this.loadPersonDossier(person);
    this.storeState();
  }

  photoPresent(person: SouscriptionPersonneContexte): boolean {
    if (person.photo_presente) return true;
    return (
      this.dossiers[person.id]?.exigences.some(
        (item) =>
          item.type_exigence === 'DOCUMENT' &&
          item.source_code?.toUpperCase() === 'PHOTO' &&
          item.satisfait,
      ) ?? false
    );
  }

  requirementAnswered(requirement: ExigenceEvaluation): boolean {
    return requirement.repondu === true;
  }

  requirementDisplayOk(requirement: ExigenceEvaluation): boolean {
    if (requirement.usage === 'LICENCE' && requirement.obligatoire) {
      return requirement.satisfait;
    }
    return requirement.satisfait || requirement.repondu;
  }

  registrationIssueMessage(personId: number): string {
    const dossier = this.dossiers[personId];
    if (!dossier || dossier.inscription_complete) return '';

    const missingCodes = new Set(dossier.exigences_manquantes_bloquantes ?? []);
    return dossier.exigences
      .filter((requirement) => missingCodes.has(requirement.code))
      .map((requirement) =>
        requirement.raison
          ? `${requirement.libelle} — ${requirement.raison}`
          : requirement.libelle,
      )
      .join(' · ');
  }

  dossierRequirements(personId: number): ExigenceEvaluation[] {
    return (this.dossiers[personId]?.exigences ?? [])
      .filter((item) => item.type_exigence !== 'PREUVE_MEDICALE')
      .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));
  }

  competitionMessage(personId: number): string {
    if (this.choice(personId).licenceType !== 'COMPETITION') return '';
    return this.medical[personId]?.message || 'Vérification de l’éligibilité compétition…';
  }

  competitionEligible(personId: number): boolean {
    return (
      this.choice(personId).licenceType === 'COMPETITION' &&
      this.medical[personId]?.eligible === true &&
      this.dossiers[personId]?.licence_complete === true
    );
  }

  updateMedicalEvaluation(
    personId: number,
    evaluation: EvaluationPreuveMedicale,
  ): void {
    this.medical[personId] = evaluation;
    const person = this.selectedPeople.find((item) => item.id === personId);
    if (person) void this.loadPersonDossier(person, false);
  }

  async editPerson(person: SouscriptionPersonneContexte): Promise<void> {
    this.storeState();
    await this.router.navigate(['/adherent'], {
      queryParams: {
        context: this.isAdminMode ? 'ADMIN' : 'MON_COMPTE',
        action: 'EDIT',
        id: person.id,
        returnUrl: this.router.url,
      },
    });
  }

  get maxInstallments(): number {
    const maxima = this.selectedPeople
      .map((person) =>
        person.tarifs.find((tariff) => tariff.id === this.choice(person.id).tariffId)
          ?.paiement_plusieurs_fois,
      )
      .filter((value): value is number => Number.isFinite(value));
    return maxima.length ? Math.min(...maxima) : 1;
  }

  get initialTotal(): number {
    return this.selectedPeople.reduce(
      (sum, person) => sum + Number(this.tariffFor(person)?.prix_centimes ?? 0),
      0,
    );
  }

  get finalTotal(): number {
    return Math.max(0, this.initialTotal - this.promoDiscount);
  }

  canContinue(): boolean {
    if (this.step === 1) {
      return (
        this.selectedPeople.length > 0 &&
        this.selectedPeople.every(
          (person) => !person.inscription_active && person.informations_completes,
        )
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
    if (this.step === 4) {
      return this.selectedPeople.every(
        (person) => this.dossiers[person.id]?.inscription_complete === true,
      );
    }
    return this.isPayerValid();
  }

  async next(): Promise<void> {
    if (!this.canContinue()) return;
    if (this.step === 3) await this.loadDossiers();
    this.step = Math.min(5, this.step + 1);
    this.storeState();
    this.scrollTop();
  }

  previous(): void {
    this.step = Math.max(1, this.step - 1);
    this.storeState();
    this.scrollTop();
  }

  async selectBooleanRequirement(
    person: SouscriptionPersonneContexte,
    requirement: ExigenceEvaluation,
    value: boolean,
  ): Promise<void> {
    if (this.loading) return;
    requirement.valeur_boolean = value;
    await this.saveRequirement(person, requirement);
  }

  async saveRequirement(
    person: SouscriptionPersonneContexte,
    requirement: ExigenceEvaluation,
  ): Promise<void> {
    if (
      requirement.type_reponse === 'BOOLEEN' &&
      typeof requirement.valeur_boolean !== 'boolean'
    ) {
      return;
    }

    await this.run('Enregistrement de la réponse', async () => {
      this.dossiers[person.id] = await this.dossierApi.saveResponse(
        {
          ...this.dossierRequest(person),
          exigence_id: requirement.id,
          valeur_boolean: requirement.valeur_boolean,
          valeur_texte: requirement.valeur_texte,
          valeur_date: requirement.valeur_date,
          document_id: requirement.document_id,
          repondu_par_personne_id: person.id,
        },
        this.isAdminMode ? this.adminAccountId : null,
      );
    });
  }

  onPayerModeChange(): void {
    if (this.payerMode === 'OTHER') {
      this.payerFirstName = '';
      this.payerLastName = '';
      this.payerEmail = '';
      this.storeState();
      return;
    }
    const person = this.selectedPeople.find((item) => item.id === this.payerMode);
    this.payerFirstName = person?.first_name ?? '';
    this.payerLastName = person?.last_name ?? '';
    this.payerEmail = person?.email ?? '';
    this.storeState();
  }

  async validatePromo(): Promise<void> {
    this.clearPromoResult();
    const code = this.promoCode.trim();
    if (!code) return;
    const tariffIds = this.selectedPeople
      .map((person) => this.choice(person.id).tariffId)
      .filter((id): id is number => id != null);
    try {
      const result = await this.api.validatePromo(this.seasonId, code, tariffIds);
      this.promoDiscount = result.montant_remise_centimes;
      this.promoMessage = result.message || `Code ${result.code ?? code} appliqué`;
    } catch (error) {
      this.promoError = this.errorMessage(error);
    }
  }

  async saveDraft(): Promise<SouscriptionView | null> {
    if (!this.isPayerValid()) return null;
    const dto: SaveSouscriptionDto = {
      saison_id: this.seasonId,
      payeur: {
        personne_id: this.payerMode === 'OTHER' ? null : Number(this.payerMode),
        first_name: this.payerFirstName.trim(),
        last_name: this.payerLastName.trim(),
        email: this.payerEmail.trim(),
      },
      nb_echeances: this.installments,
      code_promo: this.promoCode.trim() || null,
      personnes: this.selectedPeople.map((person) => ({
        personne_id: person.id,
        groupe_ids: [...this.choice(person.id).groupIds],
        tarif_inscription_id: Number(this.choice(person.id).tariffId),
        type_licence: this.choice(person.id).licenceType,
      })),
    };

    let saved: SouscriptionView | null = null;
    await this.run('Enregistrement du panier', async () => {
      saved = this.isAdminMode
        ? await this.api.saveAdminDraft({
            ...(dto as AdminSaveSouscriptionDto),
            compte_id: this.adminAccountId,
          })
        : await this.api.saveDraft(dto);
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
        this.clearStoredState();
      }
    });
  }

  async validateManualPayment(): Promise<void> {
    if (!this.isAdminMode) return;
    const draft = await this.saveDraft();
    if (!draft) return;
    await this.run('Validation manuelle du paiement', async () => {
      const result = await this.api.validateManualPayment(
        draft.id,
        this.adminAccountId,
      );
      this.returnSubscription = draft;
      this.returnConfirmed = result.paiement_confirme;
      this.returnMessage = result.message;
      this.isReturnMode = true;
      if (result.paiement_confirme) this.clearStoredState();
    });
  }

  async simulate(result: 'OK' | 'KO'): Promise<void> {
    const draft = await this.saveDraft();
    if (!draft) return;
    await this.run('Simulation du paiement', async () => {
      const response = await this.api.simulate(draft.id, result);
      this.returnSubscription = await this.api.get(draft.id);
      this.returnConfirmed = response.paiement_confirme;
      this.returnMessage = response.message;
      this.isReturnMode = true;
      if (result === 'OK') this.clearStoredState();
    });
  }

  formatMoney(centimes: number): string {
    return this.money.format(Number(centimes ?? 0) / 100);
  }

  tariffFor(person: SouscriptionPersonneContexte): SouscriptionTarifOption | null {
    return (
      person.tarifs.find((tariff) => tariff.id === this.choice(person.id).tariffId) ??
      null
    );
  }

  groupNames(person: SouscriptionPersonneContexte): string[] {
    const ids = new Set(this.choice(person.id).groupIds);
    return person.groupes.filter((group) => ids.has(group.id)).map((group) => group.nom);
  }

  private async loadSelectedBasicStatuses(): Promise<void> {
    for (const person of this.selectedPeople) await this.loadBasicPersonStatus(person);
  }

  private async loadBasicPersonStatus(person: SouscriptionPersonneContexte): Promise<void> {
    try {
      this.dossiers[person.id] = await this.dossierApi.evaluate(
        {
          saison_id: this.seasonId,
          personne_id: person.id,
          groupe_ids: [],
          tarif_inscription_id: null,
          type_licence: this.choice(person.id).licenceType,
        },
        this.isAdminMode ? this.adminAccountId : null,
      );
    } catch {
      // Le détail est rechargé à l'étape dossier.
    }
  }

  private async loadDossiers(): Promise<void> {
    await this.run('Vérification des dossiers', async () => {
      for (const person of this.selectedPeople) await this.loadPersonDossier(person);
    });
  }

  private async loadPersonDossier(
    person: SouscriptionPersonneContexte,
    loadMedical = true,
  ): Promise<void> {
    this.dossiers[person.id] = await this.dossierApi.evaluate(
      this.dossierRequest(person),
      this.isAdminMode ? this.adminAccountId : null,
    );
    if (loadMedical) {
      this.medical[person.id] = await this.dossierApi.evaluateMedicalProof(
        person.id,
        this.seasonId,
        this.choice(person.id).licenceType,
      );
    }
  }

  private dossierRequest(person: SouscriptionPersonneContexte) {
    return {
      saison_id: this.seasonId,
      personne_id: person.id,
      groupe_ids: [...this.choice(person.id).groupIds],
      tarif_inscription_id: this.choice(person.id).tariffId,
      type_licence: this.choice(person.id).licenceType,
    };
  }

  private async loadContext(): Promise<void> {
    await this.run('Chargement du tunnel', async () => {
      const seasonId = Number(this.appStore.saison_active_id());
      if (this.adminPersonId > 0 && this.appStore.isAdmin()) {
        const adminContext = await this.api.adminContextFromPerson(
          seasonId,
          this.adminPersonId,
        );
        this.context = adminContext;
        this.adminAccountId = Number(adminContext.admin_compte_id);
      } else {
        this.context = await this.api.context(seasonId);
      }
      this.context.personnes.forEach((person) => {
        person.pays ||= 'France';
        person.photo_presente = !!person.photo_presente;
        person.inscription_active = !!person.inscription_active;
      });
      this.draft = this.context.brouillon ?? null;
      if (this.draft) this.restoreDraft(this.draft);
    });
  }

  private restoreDraft(draft: SouscriptionView): void {
    this.selectedPersonIds.clear();
    this.choices = {};
    draft.personnes.forEach((line) => {
      const contextPerson = this.context?.personnes.find(
        (person) => person.id === line.personne_id,
      );
      if (contextPerson?.inscription_active) return;
      this.selectedPersonIds.add(line.personne_id);
      this.choices[line.personne_id] = {
        groupIds: [...line.groupe_ids],
        tariffId: line.tarif_inscription_id,
        licenceType: line.type_licence ?? 'LOISIR',
      };
    });
    this.payerMode = draft.payeur_personne_id ?? 'OTHER';
    this.payerFirstName = draft.payeur_prenom ?? '';
    this.payerLastName = draft.payeur_nom ?? '';
    this.payerEmail = draft.payeur_email ?? '';
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

  private isPayerValid(): boolean {
    return (
      this.payerMode != null &&
      !!this.payerFirstName.trim() &&
      !!this.payerLastName.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.payerEmail.trim())
    );
  }

  private emptyChoice(): PersonChoice {
    return { groupIds: [], tariffId: null, licenceType: 'LOISIR' };
  }

  private storeState(): void {
    const state: StoredTunnelState = {
      selectedPersonIds: Array.from(this.selectedPersonIds),
      choices: this.choices,
      payerMode: this.payerMode,
      payerFirstName: this.payerFirstName,
      payerLastName: this.payerLastName,
      payerEmail: this.payerEmail,
      step: this.step,
    };
    sessionStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  private restoreStoredState(): void {
    const raw = sessionStorage.getItem(this.storageKey);
    if (!raw) return;
    try {
      const state = JSON.parse(raw) as StoredTunnelState;
      this.selectedPersonIds = new Set(
        state.selectedPersonIds.filter((id) =>
          this.context?.personnes.some(
            (person) => person.id === id && !person.inscription_active,
          ),
        ),
      );
      this.choices = state.choices ?? {};
      this.payerMode = state.payerMode;
      this.payerFirstName = state.payerFirstName ?? '';
      this.payerLastName = state.payerLastName ?? '';
      this.payerEmail = state.payerEmail ?? '';
      this.step = Math.max(1, Math.min(5, Number(state.step || 1)));
    } catch {
      this.clearStoredState();
    }
  }

  private clearStoredState(): void {
    sessionStorage.removeItem(this.storageKey);
  }

  private clearPromoResult(): void {
    this.promoMessage = '';
    this.promoError = '';
    this.promoDiscount = 0;
  }

  private async confirmReturn(id: number): Promise<void> {
    await this.run('Confirmation du paiement', async () => {
      const result = await this.api.confirm(id);
      this.returnSubscription = result.souscription;
      this.returnConfirmed = result.paiement_confirme;
      this.returnMessage = result.message;
      if (result.paiement_confirme) this.clearStoredState();
    });
  }

  private scrollTop(): void {
    this.scrollContainer?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private errorMessage(error: any): string {
    const value =
      error?.error?.message ??
      error?.error?.error?.message ??
      error?.message ??
      error?.statusText ??
      'Une erreur est survenue';
    return Array.isArray(value) ? value.join(' · ') : String(value);
  }

  private async run(label: string, action: () => Promise<void>): Promise<void> {
    this.loading = true;
    this.action = label;
    try {
      await action();
    } catch (error) {
      ErrorService.instance.emitChange(
        ErrorService.instance.CreateError(label, this.errorMessage(error)),
      );
    } finally {
      this.loading = false;
      this.action = '';
    }
  }
}

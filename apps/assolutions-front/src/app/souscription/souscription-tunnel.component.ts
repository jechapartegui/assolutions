import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  DossierPersonneEvaluation,
  EvaluationPreuveMedicale,
  ExigenceEvaluation,
  SavePreuveMedicaleDto,
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

type MedicalForm = {
  type: 'QS_SPORT' | 'CERTIFICAT';
  date: string;
  qsNegative: boolean;
  doctorName: string;
  rpps: string;
};

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
  medicalForms: Record<number, MedicalForm> = {};
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
    this.restoreStoredState();
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
    this.choices[person.id] = {
      groupIds: [],
      tariffId: null,
      licenceType: 'LOISIR',
    };
    this.medicalForms[person.id] = this.newMedicalForm();
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
    return (this.choices[personId] ??= {
      groupIds: [],
      tariffId: null,
      licenceType: 'LOISIR',
    });
  }

  medicalForm(personId: number): MedicalForm {
    return (this.medicalForms[personId] ??= this.newMedicalForm());
  }

  eligibleGroups(person: SouscriptionPersonneContexte): SouscriptionGroupeOption[] {
    return person.groupes
      .filter((group) => group.visible && group.eligible)
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }

  hiddenGroupCount(person: SouscriptionPersonneContexte): number {
    return person.groupes.length - this.eligibleGroups(person).length;
  }

  toggleGroup(
    person: SouscriptionPersonneContexte,
    group: SouscriptionGroupeOption,
  ): void {
    if (!group.eligible) return;
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

  photoRequirement(personId: number): ExigenceEvaluation | null {
    return (
      this.dossiers[personId]?.exigences.find(
        (item) =>
          item.type_exigence === 'DOCUMENT' &&
          item.source_code?.toUpperCase() === 'PHOTO',
      ) ?? null
    );
  }

  photoPresent(personId: number): boolean {
    return this.photoRequirement(personId)?.satisfait === true;
  }

  photoKnown(personId: number): boolean {
    return !!this.photoRequirement(personId);
  }

  requirementAnswered(requirement: ExigenceEvaluation): boolean {
    if (requirement.type_reponse === 'BOOLEEN') {
      return typeof requirement.valeur_boolean === 'boolean';
    }
    return requirement.satisfait;
  }

  dossierRequirements(personId: number): ExigenceEvaluation[] {
    return (this.dossiers[personId]?.exigences ?? [])
      .filter((item) => item.type_exigence !== 'PREUVE_MEDICALE')
      .sort((a, b) => {
        if (a.usage !== b.usage) return a.usage === 'INSCRIPTION' ? -1 : 1;
        return a.libelle.localeCompare(b.libelle, 'fr');
      });
  }

  async editPerson(person: SouscriptionPersonneContexte): Promise<void> {
    this.storeState();
    await this.router.navigate(['/adherent'], {
      queryParams: {
        context: 'MON_COMPTE',
        action: 'EDIT',
        id: person.id,
        returnUrl: '/souscription',
      },
    });
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
      const tariff = this.tariffFor(person);
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

  async saveRequirement(
    person: SouscriptionPersonneContexte,
    requirement: ExigenceEvaluation,
  ): Promise<void> {
    await this.run('Enregistrement de la réponse', async () => {
      this.dossiers[person.id] = await this.dossierApi.saveResponse({
        ...this.dossierRequest(person),
        exigence_id: requirement.id,
        valeur_boolean: requirement.valeur_boolean,
        valeur_texte: requirement.valeur_texte,
        valeur_date: requirement.valeur_date,
        document_id: requirement.document_id,
        repondu_par_personne_id: person.id,
      });
    });
  }

  async saveMedicalProof(person: SouscriptionPersonneContexte): Promise<void> {
    const form = this.medicalForm(person.id);
    const dto: SavePreuveMedicaleDto = {
      personne_id: person.id,
      saison_id: this.seasonId,
      type_preuve: form.type,
      date_document: form.date,
      qs_reponses_negatives:
        form.type === 'QS_SPORT' ? form.qsNegative : null,
      valable_competition:
        form.type === 'CERTIFICAT' &&
        this.choice(person.id).licenceType === 'COMPETITION',
      medecin_nom: form.type === 'CERTIFICAT' ? form.doctorName : null,
      medecin_rpps: form.type === 'CERTIFICAT' ? form.rpps : null,
      document_id: null,
      commentaire: null,
    };
    await this.run('Enregistrement de la situation médicale', async () => {
      await this.dossierApi.saveMedicalProof(dto);
      this.medicalForms[person.id] = this.newMedicalForm();
      await this.loadPersonDossier(person);
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
        this.clearStoredState();
      }
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
    const id = this.choice(person.id).tariffId;
    return person.tarifs.find((tariff) => tariff.id === id) ?? null;
  }

  groupNames(person: SouscriptionPersonneContexte): string[] {
    const ids = new Set(this.choice(person.id).groupIds);
    return person.groupes
      .filter((group) => ids.has(group.id))
      .map((group) => group.nom);
  }

  private async loadSelectedBasicStatuses(): Promise<void> {
    for (const person of this.selectedPeople) {
      await this.loadBasicPersonStatus(person);
    }
  }

  private async loadBasicPersonStatus(
    person: SouscriptionPersonneContexte,
  ): Promise<void> {
    try {
      this.dossiers[person.id] = await this.dossierApi.evaluate({
        saison_id: this.seasonId,
        personne_id: person.id,
        groupe_ids: [],
        tarif_inscription_id: null,
        type_licence: this.choice(person.id).licenceType,
      });
    } catch {
      // Le statut détaillé sera rechargé à l'étape Dossier.
    }
  }

  private async loadDossiers(): Promise<void> {
    await this.run('Vérification des dossiers', async () => {
      for (const person of this.selectedPeople) {
        await this.loadPersonDossier(person);
      }
    });
  }

  private async loadPersonDossier(person: SouscriptionPersonneContexte) {
    this.dossiers[person.id] = await this.dossierApi.evaluate(
      this.dossierRequest(person),
    );
    this.medical[person.id] = await this.dossierApi.evaluateMedicalProof(
      person.id,
      this.seasonId,
      this.choice(person.id).licenceType,
    );
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

  private async loadContext(preserveSelection = false): Promise<void> {
    const selected = new Set(this.selectedPersonIds);
    const oldChoices = structuredClone(this.choices);
    const oldPayerMode = this.payerMode;
    const oldPayer = {
      firstName: this.payerFirstName,
      lastName: this.payerLastName,
      email: this.payerEmail,
    };

    await this.run('Chargement du tunnel', async () => {
      this.context = await this.api.context(
        Number(this.appStore.saison_active_id()),
      );
      this.context.personnes.forEach((person) => {
        person.pays ||= 'France';
      });
      this.draft = this.context.brouillon ?? null;
      if (preserveSelection) {
        this.selectedPersonIds = selected;
        this.choices = oldChoices;
        this.payerMode = oldPayerMode;
        this.payerFirstName = oldPayer.firstName;
        this.payerLastName = oldPayer.lastName;
        this.payerEmail = oldPayer.email;
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
        licenceType: line.type_licence ?? 'LOISIR',
      };
      this.medicalForms[line.personne_id] = this.newMedicalForm();
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

  private newMedicalForm(): MedicalForm {
    return {
      type: 'QS_SPORT',
      date: new Date().toISOString().slice(0, 10),
      qsNegative: true,
      doctorName: '',
      rpps: '',
    };
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
          this.context?.personnes.some((person) => person.id === id),
        ),
      );
      this.choices = state.choices ?? {};
      this.payerMode = state.payerMode;
      this.payerFirstName = state.payerFirstName ?? '';
      this.payerLastName = state.payerLastName ?? '';
      this.payerEmail = state.payerEmail ?? '';
      this.step = Math.max(1, Math.min(5, Number(state.step || 1)));
      this.selectedPeople.forEach((person) => {
        this.medicalForms[person.id] = this.newMedicalForm();
      });
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
    this.scrollContainer?.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
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

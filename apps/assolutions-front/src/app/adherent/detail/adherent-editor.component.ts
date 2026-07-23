import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ValidationItem } from '@shared/lib/autres.interface';
import { ItemContact } from '@shared/lib/personne.interface';
import {
  Adresse,
  Compte,
  Groupe,
  InscriptionSaison,
  LienGroupe_VM,
  Saison,
} from '@shared/index';
import {
  AdherentDetail_VM,
  AdherentPageVm,
} from 'apps/assolutions-front/src/vm/adherent-page.vm';
import { AdherentRepository } from 'apps/assolutions-front/src/repository/adherent.repository';
import { AdherentStore } from 'apps/assolutions-front/src/store/adherent.store';
import { ErrorService } from 'apps/assolutions-front/src/services/error.service';
import { CompteApiService } from 'apps/assolutions-front/src/services/compte-api.service';
import { PersonneApiService } from 'apps/assolutions-front/src/services/personne-api.service';
import { ContactApiService, ContactDto } from 'apps/assolutions-front/src/services/contact-api.service';
import { combineLatest, Subscription } from 'rxjs';

import { AppStore } from '../../app.store';
import { AddInfoEditorComponent } from '../../add-info-editor/add-info-editor.component';

type ContactType = 'EMAIL' | 'PHONE';

interface PersonneCoordonneesSource {
  id: number;
  nom?: string;
  prenom?: string;
  surnom?: string;
  libelle?: string;
  compte?: number | { id?: number } | null;
  adresse?: Adresse | Record<string, unknown> | null;
  contact?: ItemContact[];
  contact_prevenir?: ItemContact[];
}

@Component({
  selector: 'app-adherent-editor',
  templateUrl: './adherent-editor.component.html',
  styleUrls: ['./adherent-editor.component.css'],
  standalone: false,
})
export class AdherentEditorComponent implements OnInit, OnChanges, OnDestroy {
  @Input() vm?: AdherentPageVm;
  @Input() isAdmin = false;
  @Output() back = new EventEmitter<void>();

  @ViewChild('addInfoEditor')
  addInfoEditor?: AddInfoEditorComponent;

  public loading = false;
  public loadingComptes = false;

  public rNom: ValidationItem = { key: true, value: '' };
  public rPrenom: ValidationItem = { key: true, value: '' };
  public rDateNaissance: ValidationItem = { key: true, value: '' };
  public rCompte: ValidationItem = { key: true, value: '' };
  public rEmail: ValidationItem = { key: true, value: '' };
  public rPhone: ValidationItem = { key: true, value: '' };
  public rAdresse: ValidationItem = { key: true, value: '' };

  public comptesDisponibles: Compte[] = [];

  public newCompteEmail = '';
  public newComptePassword = '';
  public newCompteAvecPassword = false;

  public loadingPersonnesCompte = false;
  public personnesDuCompte: PersonneCoordonneesSource[] = [];
  public sourcePersonneId: number | null = null;
  public copyAdresse = true;
  public copyContacts = true;
  public copyContactPrevenir = true;
  public copyFeedback = '';

  private routeSubscription?: Subscription;
  private sourceLoadSequence = 0;
  private lastSourceCompteId: number | null = null;
  private hasExplicitCompteSelection = false;
  private dateNaissanceText = '';
  private userEditedBirthDate = false;
  private lastAdherentRef: AdherentDetail_VM | null = null;

  constructor(
    private readonly repository: AdherentRepository,
    private readonly store: AdherentStore,
    private readonly route: ActivatedRoute,
    private readonly appstore: AppStore,
    private readonly compteApi: CompteApiService,
    private readonly personneApi: PersonneApiService,
    private readonly contactApi: ContactApiService
  ) {}

  get currentVm(): AdherentPageVm | null {
    return this.vm ?? this.store.vm();
  }

  get adherent(): AdherentDetail_VM | null {
    return this.currentVm?.editAdherent ?? null;
  }

  async ngOnInit(): Promise<void> {
    await this.initFromRouteIfNeeded();
    this.applyCompteRuleBeforeValidation();
    await this.loadComptesIfNeeded();
    this.syncViewState();
    await this.refreshPersonnesDuCompte(true);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vm']) {
      this.applyCompteRuleBeforeValidation();
      this.syncViewState();
      void this.loadComptesAndSources();
    }
  }

  private async loadComptesAndSources(): Promise<void> {
    await this.loadComptesIfNeeded();
    await this.refreshPersonnesDuCompte(true);
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  private async initFromRouteIfNeeded(): Promise<void> {
    if (this.vm) return;

    this.routeSubscription = combineLatest([
      this.route.paramMap,
      this.route.queryParamMap,
    ]).subscribe(async ([paramMap, queryParamMap]) => {
      const rawId = queryParamMap.get('id') ?? paramMap.get('id');

      if (!rawId) {
        this.syncViewState();
        return;
      }

      const id = Number(rawId);
      if (!Number.isFinite(id) || id <= 0) {
        this.syncViewState();
        return;
      }

      await this.tryLoadForRoute(id);
      this.applyCompteRuleBeforeValidation();
      await this.loadComptesIfNeeded();
      this.syncViewState();
      await this.refreshPersonnesDuCompte(true);
    });
  }

  private async tryLoadForRoute(id: number): Promise<void> {
    const saisonId = this.activeSaisonId;
    if (!saisonId) return;

    this.loading = true;

    try {
      const context = this.route.snapshot.queryParamMap.get('context');

      if (context === 'MON_COMPTE') {
        await this.store.openMonCompteAdherent(id, saisonId);
      } else {
        await this.store.init(saisonId);
        await this.store.openAdherent(id, saisonId);
      }
    } catch (err) {
      console.error('Chargement route adherent-edit impossible', err);
    } finally {
      this.loading = false;
    }
  }

  private syncViewState(): void {
    const adherent = this.adherent;
    if (!adherent) return;

    const isNewRef = adherent !== this.lastAdherentRef;
    if (isNewRef) {
      this.lastAdherentRef = adherent;
      this.userEditedBirthDate = false;
      this.newCompteEmail = '';
      this.newComptePassword = '';
      this.newCompteAvecPassword = false;
      this.hasExplicitCompteSelection = false;

      // En création depuis un écran admin/prof, on ne conserve jamais un compte
      // éventuellement prérempli avec le compte connecté : le choix est obligatoire.
      if (Number(adherent.id) === 0 && this.canEditCompte()) {
        adherent.compte = null as any;
      }

      this.resetSourceSelection();
    }

    adherent.contact = this.extractContacts((adherent as any).contact);
    adherent.contact_prevenir = this.extractContacts((adherent as any).contact_prevenir);
    adherent.inscriptionsSaison ??= [];
    adherent.inscriptionsSeance ??= [];
    adherent.groupesParSaison ??= [];
    this.ensureAdresseObject(adherent);
    adherent.photo ??= null;

    this.clearProbablyDefaultBirthDate(adherent);
    this.syncDateTextFromModel();
    this.ensureRequiredMainContacts();
    this.syncEmailContactFromAccount(false);
    this.normalizePreferredContact();
    this.checkall();
  }


  private ensureAdresseObject(adherent: AdherentDetail_VM): void {
    const rawAdresse = this.parseJsonValue((adherent as any).adresse);
    adherent.adresse = Object.assign(new Adresse(), rawAdresse ?? {});

    // Les retours back / imports peuvent parfois renvoyer number/null au lieu de string.
    // On normalise tout de suite pour éviter les .trim() qui explosent.
    adherent.adresse.Street = this.asText(adherent.adresse.Street);
    adherent.adresse.PostCode = this.asText(adherent.adresse.PostCode);
    adherent.adresse.City = this.asText(adherent.adresse.City);
    adherent.adresse.Country = this.asText(adherent.adresse.Country) || 'France';
  }

  private asText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value);
  }

  // ---------------------------------------------------------------------------
  // Date de naissance
  // ---------------------------------------------------------------------------

  get dateNaissanceValue(): string {
    return this.dateNaissanceText;
  }

  setDateNaissanceValue(value: string): void {
    const adherent = this.adherent;
    if (!adherent) return;

    this.userEditedBirthDate = true;
    this.dateNaissanceText = value ?? '';

    const parsed = this.parseBirthDate(this.dateNaissanceText);
    if (parsed) {
      adherent.date_naissance = parsed;
    } else if (!this.dateNaissanceText.trim()) {
      adherent.date_naissance = null as any;
    }

    this.checkall();
  }

  private syncDateTextFromModel(): void {
    if (this.userEditedBirthDate) return;
    this.dateNaissanceText = this.formatDateFr(this.adherent?.date_naissance);
  }

  private clearProbablyDefaultBirthDate(adherent: AdherentDetail_VM): void {
    if (this.userEditedBirthDate) return;
    if (Number(adherent.id) > 0) return;

    const value = adherent.date_naissance;
    if (!(value instanceof Date)) return;

    const now = new Date();
    const sameDay =
      value.getFullYear() === now.getFullYear() &&
      value.getMonth() === now.getMonth() &&
      value.getDate() === now.getDate();

    if (sameDay) {
      adherent.date_naissance = null as any;
    }
  }

  private parseBirthDate(value: string): Date | null {
    const clean = (value ?? '').trim();
    if (!clean) return null;

    let day: number;
    let month: number;
    let year: number;

    const fr = clean.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    const iso = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

    if (fr) {
      day = Number(fr[1]);
      month = Number(fr[2]);
      year = Number(fr[3]);
    } else if (iso) {
      year = Number(iso[1]);
      month = Number(iso[2]);
      day = Number(iso[3]);
    } else {
      return null;
    }

    if (!this.isValidDateParts(year, month, day)) return null;

    // Midi local : évite les glissements de date liés à UTC/minuit.
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  private isValidDateParts(year: number, month: number, day: number): boolean {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return false;
    }

    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    const d = new Date(year, month - 1, day, 12, 0, 0, 0);
    return (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    );
  }

  private formatDateFr(value: Date | string | null | undefined): string {
    if (!value) return '';

    if (typeof value === 'string') {
      const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

      const fr = value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
      if (fr) return `${fr[1].padStart(2, '0')}/${fr[2].padStart(2, '0')}/${fr[3]}`;

      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return '';
      return this.formatDateFr(parsed);
    }

    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';

    const day = `${value.getDate()}`.padStart(2, '0');
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const year = value.getFullYear();

    return `${day}/${month}/${year}`;
  }

  get dateNaissanceLabel(): string {
    return this.formatDateFr(this.adherent?.date_naissance) || 'Non renseignée';
  }

  // ---------------------------------------------------------------------------
  // Référentiels / états calculés
  // ---------------------------------------------------------------------------

  get saisonsDisponibles(): Saison[] {
    return this.currentVm?.refs?.listeSaison ?? [];
  }

  get groupesDisponibles(): Groupe[] {
    return this.currentVm?.refs?.liste_groupe_filter ?? [];
  }

  get activeSaisonId(): number | null {
    return this.appstore.saison_active_id();
  }

  get hasSaisonActive(): boolean {
    const activeId = this.activeSaisonId;
    if (!activeId) return false;

    return !!this.adherent?.inscriptionsSaison?.some(
      (x: InscriptionSaison) => x.saison_id === activeId
    );
  }

  get statutInscriptionLabel(): string {
    return this.hasSaisonActive
      ? 'Inscrit saison active'
      : 'Non inscrit saison active';
  }

  get archiveActionLabel(): string {
    return this.adherent?.archive ? 'Désarchiver' : 'Archiver';
  }

  get getEmailPrincipal(): string {
    const preferredMail = (this.adherent?.contact ?? []).find(
      (c: ItemContact) => c?.Type === 'EMAIL' && c.Pref && !!c.Value?.trim()
    );
    if (preferredMail) return preferredMail.Value ?? '';

    const firstMail = (this.adherent?.contact ?? []).find(
      (c: ItemContact) => c?.Type === 'EMAIL' && !!c.Value?.trim()
    );
    return firstMail ? firstMail.Value : '';
  }

  get getPhonePrincipal(): string {
    const preferredPhone = (this.adherent?.contact ?? []).find(
      (c: ItemContact) => c?.Type === 'PHONE' && c.Pref && !!c.Value?.trim()
    );
    if (preferredPhone) return preferredPhone.Value ?? '';

    const firstPhone = (this.adherent?.contact ?? []).find(
      (c: ItemContact) => c?.Type === 'PHONE' && !!c.Value?.trim()
    );
    return firstPhone ? firstPhone.Value : '';
  }

  // ---------------------------------------------------------------------------
  // Compte associé
  // ---------------------------------------------------------------------------

  public canEditCompte(): boolean {
    return (
      this.isAdmin ||
      this.appstore.mode() === 'ADMIN' ||
      this.appstore.isProf() === true
    );
  }

  public isMonCompteContext(): boolean {
    return this.route.snapshot.queryParamMap.get('context') === 'MON_COMPTE';
  }

  /**
   * Seul un utilisateur standard venant de « Mon compte » est rattaché
   * automatiquement au compte connecté. Un admin ou un professeur conserve
   * toujours le compte explicitement sélectionné dans la liste.
   */
  public usesConnectedCompteAutomatically(): boolean {
    return this.isMonCompteContext() && !this.canEditCompte();
  }

  public canCreateCompteInline(): boolean {
    return (this.isAdmin || this.appstore.mode() === 'ADMIN') && !this.isMonCompteContext();
  }

  public mustChooseCompte(): boolean {
    return this.canEditCompte() && !this.usesConnectedCompteAutomatically();
  }

  public async onCompteSelected(): Promise<void> {
    this.hasExplicitCompteSelection = Number(this.adherent?.compte) > 0;
    this.resetSourceSelection();
    console.log(this.adherent?.compte, this.hasExplicitCompteSelection);
    if (Number(this.adherent?.compte) > 0) {
      this.newCompteEmail = '';
      this.newComptePassword = '';
      this.newCompteAvecPassword = false;
      this.syncEmailContactFromAccount(true);
    }

    this.checkall();
    await this.refreshPersonnesDuCompte(true);
  }

  public onNewCompteEmailChange(value: string): void {
    this.newCompteEmail = value ?? '';
    this.hasExplicitCompteSelection = false;
    this.resetSourceSelection();

    if (!Number(this.adherent?.compte) && this.isValidEmail(this.newCompteEmail)) {
      this.syncEmailContactFromValue(this.newCompteEmail.trim().toLowerCase(), true);
    }

    this.checkall();
  }

  public getCompteLabel(compte: any): string {
    const login = compte?.login ?? compte?.email;
    if (login) return login;

    const id = compte?.id;
    return id ? `Compte ${id}` : 'Compte sans libellé';
  }

  private getCurrentProjectId(): number | null {
    const storeAny = this.appstore as any;

    const selectedProject =
      typeof storeAny.selectedProject === 'function'
        ? storeAny.selectedProject()
        : storeAny.selectedProject;

    const raw =
      selectedProject?.id ??
      storeAny.project_id?.() ??
      storeAny.projectId?.() ??
      storeAny.selected_project_id?.() ??
      storeAny.session?.()?.project_id ??
      storeAny.session?.()?.project?.id;

    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private getConnectedCompte(): any | null {
    const storeAny = this.appstore as any;
    return storeAny.compte?.() ?? storeAny.session?.()?.compte ?? storeAny.session?.()?.login ?? null;
  }

  private getConnectedCompteId(): number | null {
    const compte = this.getConnectedCompte();
    const id = Number(compte?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private getConnectedCompteEmail(): string {
    const compte = this.getConnectedCompte();
    const raw = compte?.login ?? compte?.email ?? '';
    const email = String(raw).trim().toLowerCase();
    return this.isValidEmail(email) ? email : '';
  }

  private getSelectedCompte(): any | null {
    const compteId = Number(this.adherent?.compte);
    if (!compteId) return null;

    return this.comptesDisponibles.find((c: any) => Number(c.id) === compteId) ?? null;
  }

  private getSelectedCompteEmail(): string {
    const compte = this.getSelectedCompte();
    const raw = compte?.login ?? compte?.email ?? '';
    const email = String(raw).trim().toLowerCase();

    return this.isValidEmail(email) ? email : '';
  }

  private getEffectiveCompteId(): number | null {
    if (this.usesConnectedCompteAutomatically()) return this.getConnectedCompteId();

    const id = Number(this.adherent?.compte);
    return Number.isFinite(id) && id > 0 ? id : null;
  }


  private getCompteEmailCandidate(): string {
    if (this.usesConnectedCompteAutomatically()) return this.getConnectedCompteEmail();
    if (Number(this.adherent?.compte) > 0) return this.getSelectedCompteEmail();
    if (this.isValidEmail(this.newCompteEmail)) return this.newCompteEmail.trim().toLowerCase();
    return '';
  }

  private applyCompteRuleBeforeValidation(): void {
    const adherent = this.adherent;
    if (!adherent) return;

    if (this.usesConnectedCompteAutomatically()) {
      const compteId = this.getConnectedCompteId();
      if (compteId) adherent.compte = compteId;
    }
  }

  private async loadComptesIfNeeded(): Promise<void> {
    if (!this.mustChooseCompte()) return;

    const projectId = this.getCurrentProjectId();
    if (!projectId) {
      this.comptesDisponibles = [];
      return;
    }

    this.loadingComptes = true;

    try {
      this.comptesDisponibles = await this.compteApi.listByProject(projectId);
      this.syncEmailContactFromAccount(false);
      this.checkall();
    } catch (error) {
      console.error('Chargement des comptes impossible', error);
      this.comptesDisponibles = [];
    } finally {
      this.loadingComptes = false;
    }
  }

  private hasCompte(): boolean {
    const adherent = this.adherent;
    if (!adherent) return false;

    if (this.usesConnectedCompteAutomatically()) return Number(this.getConnectedCompteId()) > 0;

    if (Number(adherent.id) === 0 && this.canEditCompte() && !this.wantsCreateCompteOnSave()) {
      return this.hasExplicitCompteSelection && Number(adherent.compte) > 0;
    }

    if (Number(adherent.compte) > 0) return true;
    if (this.canCreateCompteInline()) return this.hasValidNewCompteToCreate();

    return false;
  }

  private wantsCreateCompteOnSave(): boolean {
    return (
      this.canCreateCompteInline() &&
      !Number(this.adherent?.compte) &&
      !!this.newCompteEmail?.trim()
    );
  }

  private hasValidNewCompteToCreate(): boolean {
    if (!this.wantsCreateCompteOnSave()) return false;
    if (!this.isNewCompteEmailValid()) return false;
    if (!this.newCompteAvecPassword) return true;

    return !!this.newComptePassword && this.newComptePassword.length >= 8 && /\d/.test(this.newComptePassword);
  }

  public isNewCompteEmailValid(): boolean {
    const email = this.newCompteEmail?.trim().toLowerCase();
    return this.isValidEmail(email);
  }

  private async createCompteOnSave(): Promise<void> {
    const adherent = this.adherent;
    const projectId = this.getCurrentProjectId();

    if (!adherent) throw new Error($localize`Adhérent introuvable.`);
    if (!projectId) throw new Error($localize`Impossible de créer un compte sans projet courant.`);
    if (!this.isNewCompteEmailValid()) throw new Error($localize`Email du nouveau compte invalide.`);

    if (
      this.newCompteAvecPassword &&
      (!this.newComptePassword || this.newComptePassword.length < 8 || !/\d/.test(this.newComptePassword))
    ) {
      throw new Error($localize`Le mot de passe doit contenir au moins 8 caractères et un nombre.`);
    }

    const email = this.newCompteEmail.trim().toLowerCase();

    const compte = await this.compteApi.createWithProject({
      email,
      login: email,
      password: this.newCompteAvecPassword ? this.newComptePassword : null,
      actif: true,
      mail_actif: false,
      echec_connexion: false,
      project_id: projectId,
    } as any);

    adherent.compte = compte.id;
    this.hasExplicitCompteSelection = true;

    const alreadyInList = this.comptesDisponibles.some(
      (c: any) => Number(c.id) === Number(compte.id)
    );

    if (!alreadyInList) this.comptesDisponibles = [...this.comptesDisponibles, compte];

    this.syncEmailContactFromValue(email, true);
    this.newCompteEmail = '';
    this.newComptePassword = '';
    this.newCompteAvecPassword = false;
    this.resetSourceSelection();
  }

  // ---------------------------------------------------------------------------
  // Reprise des coordonnées d'une autre personne du compte
  // ---------------------------------------------------------------------------

  public canDisplayCoordinateCopy(): boolean {
    return !!this.getEffectiveCompteId() && !this.wantsCreateCompteOnSave();
  }

  public get selectedSourcePerson(): PersonneCoordonneesSource | null {
    const id = Number(this.sourcePersonneId);
    if (!id) return null;
    return this.personnesDuCompte.find((p) => Number(p.id) === id) ?? null;
  }

  public getSourcePersonLabel(personne: PersonneCoordonneesSource): string {
    const libelle = this.asText(personne.libelle).trim();
    if (libelle) return libelle;

    const nomComplet = `${this.asText(personne.prenom).trim()} ${this.asText(personne.nom).trim()}`.trim();
    if (nomComplet) return nomComplet;

    const surnom = this.asText(personne.surnom).trim();
    return surnom || `Personne ${personne.id}`;
  }

  public sourceHasAdresse(personne: PersonneCoordonneesSource | null = this.selectedSourcePerson): boolean {
    if (!personne?.adresse) return false;
    const adresse = personne.adresse as any;
    return !!(
      this.asText(adresse.Street ?? adresse.street).trim() ||
      this.asText(adresse.PostCode ?? adresse.postCode ?? adresse.post_code).trim() ||
      this.asText(adresse.City ?? adresse.city).trim()
    );
  }

  public sourceContactCount(personne: PersonneCoordonneesSource | null = this.selectedSourcePerson): number {
    return (personne?.contact ?? []).filter((c) => !!this.asText((c as any)?.Value ?? (c as any)?.value).trim()).length;
  }

  public sourceContactPrevenirCount(personne: PersonneCoordonneesSource | null = this.selectedSourcePerson): number {
    return (personne?.contact_prevenir ?? []).filter(
      (c) => !!this.asText((c as any)?.Value ?? (c as any)?.value).trim()
    ).length;
  }

  public getSourceAdresseLabel(personne: PersonneCoordonneesSource | null = this.selectedSourcePerson): string {
    if (!personne?.adresse) return 'Aucune adresse';
    const adresse = personne.adresse as any;
    const street = this.asText(adresse.Street ?? adresse.street).trim();
    const postCode = this.asText(adresse.PostCode ?? adresse.postCode ?? adresse.post_code).trim();
    const city = this.asText(adresse.City ?? adresse.city).trim();
    const country = this.asText(adresse.Country ?? adresse.country).trim();
    return [street, [postCode, city].filter(Boolean).join(' '), country].filter(Boolean).join(' · ') || 'Aucune adresse';
  }

  public onSourcePersonSelected(): void {
    this.copyFeedback = '';
    const source = this.selectedSourcePerson;
    this.copyAdresse = this.sourceHasAdresse(source);
    this.copyContacts = this.sourceContactCount(source) > 0;
    this.copyContactPrevenir = this.sourceContactPrevenirCount(source) > 0;
  }

  public canCopySelectedInformations(): boolean {
    const source = this.selectedSourcePerson;
    if (!source) return false;

    return (
      (this.copyAdresse && this.sourceHasAdresse(source)) ||
      (this.copyContacts && this.sourceContactCount(source) > 0) ||
      (this.copyContactPrevenir && this.sourceContactPrevenirCount(source) > 0)
    );
  }

  public copySelectedInformations(): void {
    const adherent = this.adherent;
    const source = this.selectedSourcePerson;
    if (!adherent || !source || !this.canCopySelectedInformations()) return;

    const copied: string[] = [];

    if (this.copyAdresse && this.sourceHasAdresse(source)) {
      adherent.adresse = this.cloneAdresse(source.adresse, false);
      copied.push('adresse');
    }

    if (this.copyContacts && this.sourceContactCount(source) > 0) {
      adherent.contact = this.mergeContacts(
        adherent.contact ?? [],
        source.contact ?? [],
        false
      );
      copied.push('contacts principaux');
    }

    if (this.copyContactPrevenir && this.sourceContactPrevenirCount(source) > 0) {
      adherent.contact_prevenir = this.sanitizeEmergencyContacts(
        this.mergeContacts(
          adherent.contact_prevenir ?? [],
          source.contact_prevenir ?? [],
          false
        )
      );
      copied.push('contacts à prévenir');
    }

    this.ensureRequiredMainContacts();
    this.normalizePreferredContact();
    this.commitNestedReferences();
    this.checkall();

    this.copyFeedback = copied.length
      ? `${copied.join(', ')} récupéré${copied.length > 1 ? 's' : ''}. Vérifiez les informations avant de sauvegarder.`
      : '';
  }

  private resetSourceSelection(): void {
    this.sourceLoadSequence += 1;
    this.loadingPersonnesCompte = false;
    this.personnesDuCompte = [];
    this.sourcePersonneId = null;
    this.copyAdresse = true;
    this.copyContacts = true;
    this.copyContactPrevenir = true;
    this.copyFeedback = '';
    this.lastSourceCompteId = null;
  }

  private async refreshPersonnesDuCompte(force = false): Promise<void> {
    const compteId = this.getEffectiveCompteId();

    if (!compteId || this.wantsCreateCompteOnSave()) {
      this.resetSourceSelection();
      return;
    }

    if (!force && this.lastSourceCompteId === compteId) return;

    const requestId = ++this.sourceLoadSequence;
    this.loadingPersonnesCompte = true;
    this.lastSourceCompteId = compteId;

    try {
      // Source unique, quel que soit le contexte : compte normal, professeur ou admin.
      const rawPersonnes = await this.personneApi.list_by_compte(compteId);
      const personnes = Array.isArray(rawPersonnes) ? rawPersonnes : [];

      const personneIds = [...new Set(
        personnes
          .map((personne) => Number(personne?.id))
          .filter((id) => Number.isFinite(id) && id > 0)
      )];

      // Les contacts ne sont plus portés par la table personne : on les charge séparément.
      const contacts = personneIds.length
        ? await this.contactApi.list_by_id(personneIds)
        : [];

      const contactsByPersonne = new Map<number, ContactDto[]>();
      for (const contact of contacts ?? []) {
        const personneId = Number(contact?.object_id);
        if (!Number.isFinite(personneId) || personneId <= 0) continue;

        const current = contactsByPersonne.get(personneId) ?? [];
        current.push(contact);
        contactsByPersonne.set(personneId, current);
      }

      const sources = personnes
        .map((personne: any) => {
          const personneId = Number(personne?.id);
          const personneContacts = contactsByPersonne.get(personneId) ?? [];

          return this.normalizeSourcePerson(
            {
              ...personne,
              contact: personneContacts.filter(
                (contact) => contact.contact_list === 'liste_contact'
              ),
              contact_prevenir: personneContacts.filter(
                (contact) => contact.contact_list === 'liste_contact_prevenir'
              ),
            },
            compteId
          );
        })
        .filter(
          (personne): personne is PersonneCoordonneesSource =>
            personne !== null &&
            Number(personne.id) !== Number(this.adherent?.id) &&
            this.personHasUsableCoordinates(personne)
        )
        .sort((a, b) =>
          this.getSourcePersonLabel(a).localeCompare(
            this.getSourcePersonLabel(b),
            'fr'
          )
        );

      if (requestId !== this.sourceLoadSequence) return;

      this.personnesDuCompte = sources;

      if (!sources.some((personne) => Number(personne.id) === Number(this.sourcePersonneId))) {
        this.sourcePersonneId = null;
        this.copyFeedback = '';
      }
    } catch (error) {
      console.error('Chargement des personnes et contacts du compte impossible', error);

      if (requestId === this.sourceLoadSequence) {
        this.personnesDuCompte = [];
        this.sourcePersonneId = null;
      }
    } finally {
      if (requestId === this.sourceLoadSequence) {
        this.loadingPersonnesCompte = false;
      }
    }
  }

  private normalizeSourcePerson(
    raw: any,
    compteId: number
  ): PersonneCoordonneesSource | null {
    if (!raw) return null;

    const id = Number(raw.id ?? raw.personne_id ?? raw.personneId);
    if (!Number.isFinite(id) || id <= 0) return null;

    const personCompteId = this.getPersonCompteId(raw);
    if (personCompteId && personCompteId !== compteId) return null;

    return {
      id,
      nom: raw.nom ?? raw.last_name,
      prenom: raw.prenom ?? raw.first_name,
      surnom: raw.surnom ?? raw.nickname,
      libelle: raw.libelle,
      compte: personCompteId || compteId,
      adresse: this.cloneAdresse(raw.adresse ?? raw.address, true),
      contact: this.extractContacts(
        raw.contact ?? raw.contacts ?? raw.contact_principal ?? raw.contacts_principaux
      ),
      contact_prevenir: this.extractContacts(
        raw.contact_prevenir ??
          raw.contacts_prevenir ??
          raw.contactAPrevenir ??
          raw.emergency_contacts
      ),
    };
  }

  private extractContacts(raw: any): ItemContact[] {
    const parsed = this.parseJsonValue(raw);
    const collection = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.data)
        ? parsed.data
        : [];

    return collection
      .map((contact) => this.cloneContact(contact, true))
      .filter((contact) => !!contact.Value?.trim());
  }

  private getPersonCompteId(personne: any): number | null {
    const raw =
      personne?.compte?.id ??
      personne?.compte ??
      personne?.compte_id ??
      personne?.compteId ??
      personne?.account_id ??
      personne?.accountId;

    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private personHasUsableCoordinates(personne: PersonneCoordonneesSource): boolean {
    return (
      this.sourceHasAdresse(personne) ||
      this.sourceContactCount(personne) > 0 ||
      this.sourceContactPrevenirCount(personne) > 0
    );
  }

  // ---------------------------------------------------------------------------
  // Validation / sauvegarde
  // ---------------------------------------------------------------------------

  async save(): Promise<void> {
    const errorService = ErrorService.instance;
    const vm = this.currentVm;
    const adherent = this.adherent;

    this.prepareAdherentForSave();
    this.checkall();

    if (!adherent) return;

    if (!vm?.isValid) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Sauvegarder l'adhérent`,
          $localize`Certains champs obligatoires sont incomplets.`
        )
      );
      return;
    }

    if (!this.hasCompte()) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Sauvegarder l'adhérent`,
          $localize`Vous devez associer un compte à cette personne.`
        )
      );
      return;
    }

    try {
      this.loading = true;

      if (this.wantsCreateCompteOnSave()) {
        await this.createCompteOnSave();
      }

      this.prepareAdherentForSave();
      this.checkall();

      if (!this.hasCompte()) throw new Error($localize`Vous devez associer un compte à cette personne.`);
      if (!this.currentVm?.isValid) throw new Error($localize`Certains champs obligatoires sont incomplets.`);

      adherent.inscrit = this.hasSaisonActive;

      const saved = await this.store.saveDetail();

      if (this.addInfoEditor && saved?.id > 0) {
        this.addInfoEditor.objectId = saved.id;
        await this.addInfoEditor.save();
      }

      errorService.emitChange(
        errorService.OKMessage(
          adherent.id > 0
            ? $localize`Mettre à jour un adhérent`
            : $localize`Ajouter un adhérent`
        )
      );

      this.back.emit();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : $localize`Erreur inconnue`;

      errorService.emitChange(
        errorService.CreateError($localize`Sauvegarder l'adhérent`, message)
      );
    } finally {
      this.loading = false;
    }
  }

  private prepareAdherentForSave(): void {
    const adherent = this.adherent;
    if (!adherent) return;

    this.applyCompteRuleBeforeValidation();

    const compteId = this.getEffectiveCompteId();
    if (compteId) adherent.compte = compteId;

    this.ensureRequiredMainContacts();
    this.syncEmailContactFromAccount(false);
    this.normalizePreferredContact();

    // Nouvelles références : important pour les stores/signaux et pour que le
    // payload de sauvegarde contienne bien les contacts modifiés.
    adherent.contact = (adherent.contact ?? [])
      .map((contact) => this.cloneContact(contact, true))
      .filter((contact) => !!contact.Value?.trim());

    adherent.contact_prevenir = this.sanitizeEmergencyContacts(
      (adherent.contact_prevenir ?? [])
        .map((contact) => this.cloneContact(contact, true))
        .filter((contact) => !!contact.Value?.trim())
    );

    adherent.adresse = this.cloneAdresse(adherent.adresse, true);

    this.ensureRequiredMainContacts();
    this.normalizePreferredContact();
    this.commitNestedReferences();
  }

  private commitNestedReferences(): void {
    const adherent = this.adherent;
    if (!adherent) return;

    adherent.contact = [...(adherent.contact ?? [])];
    adherent.contact_prevenir = [...(adherent.contact_prevenir ?? [])];
    adherent.adresse = Object.assign(new Adresse(), adherent.adresse ?? {});
  }

  checkall(): void {
    const adherent = this.adherent;
    const vm = this.currentVm;

    this.rNom = { key: true, value: '' };
    this.rPrenom = { key: true, value: '' };
    this.rDateNaissance = { key: true, value: '' };
    this.rCompte = { key: true, value: '' };
    this.rEmail = { key: true, value: '' };
    this.rPhone = { key: true, value: '' };
    this.rAdresse = { key: true, value: '' };

    if (!adherent || !vm) return;

    this.ensureRequiredMainContacts();

    if (!adherent.nom || !adherent.nom.trim()) {
      this.rNom = { key: false, value: $localize`Le nom doit être saisi.` };
    } else if (adherent.nom.trim().length < 2) {
      this.rNom = { key: false, value: $localize`Le nom doit faire au moins 2 caractères.` };
    }

    if (!adherent.prenom || !adherent.prenom.trim()) {
      this.rPrenom = { key: false, value: $localize`Le prénom doit être saisi.` };
    } else if (adherent.prenom.trim().length < 2) {
      this.rPrenom = { key: false, value: $localize`Le prénom doit faire au moins 2 caractères.` };
    }

    if (!this.parseBirthDate(this.dateNaissanceText)) {
      this.rDateNaissance = {
        key: false,
        value: $localize`La date de naissance est obligatoire au format JJ/MM/AAAA.`,
      };
    }

    if (!this.hasCompte()) {
      this.rCompte = {
        key: false,
        value: this.usesConnectedCompteAutomatically()
          ? $localize`Votre compte connecté est introuvable.`
          : $localize`Vous devez sélectionner un compte existant ou saisir un nouveau compte valide.`,
      };
    }

    if (this.wantsCreateCompteOnSave() && !this.isNewCompteEmailValid()) {
      this.rCompte = { key: false, value: $localize`Email du nouveau compte invalide.` };
    }

    if (
      this.wantsCreateCompteOnSave() &&
      this.newCompteAvecPassword &&
      (!this.newComptePassword || this.newComptePassword.length < 8 || !/\d/.test(this.newComptePassword))
    ) {
      this.rCompte = {
        key: false,
        value: $localize`Le mot de passe doit contenir au moins 8 caractères et un nombre.`,
      };
    }

    const email = this.getRequiredEmailContact();
    if (!email?.Value?.trim()) {
      this.rEmail = { key: false, value: $localize`Un email est obligatoire.` };
    } else if (!this.isValidEmail(email.Value)) {
      this.rEmail = { key: false, value: $localize`L'email principal est invalide.` };
    }

    const phone = this.getRequiredPhoneContact();
    if (!phone?.Value?.trim()) {
      this.rPhone = { key: false, value: $localize`Un téléphone est obligatoire.` };
    } else if (!this.isValidPhone(phone.Value)) {
      this.rPhone = { key: false, value: $localize`Le téléphone principal est invalide.` };
    }

    const street = this.asText(adherent.adresse?.Street).trim();
    const postCode = this.asText(adherent.adresse?.PostCode).trim();
    const city = this.asText(adherent.adresse?.City).trim();
    const country = this.asText(adherent.adresse?.Country).trim();

    if (!street) {
      this.rAdresse = { key: false, value: $localize`L'adresse est obligatoire.` };
    } else if (!postCode) {
      this.rAdresse = { key: false, value: $localize`Le code postal est obligatoire.` };
    } else if (!city) {
      this.rAdresse = { key: false, value: $localize`La ville est obligatoire.` };
    } else if (!country) {
      this.rAdresse = { key: false, value: $localize`Le pays est obligatoire.` };
    }

    vm.isValid =
      this.rNom.key &&
      this.rPrenom.key &&
      this.rDateNaissance.key &&
      this.rCompte.key &&
      this.rEmail.key &&
      this.rPhone.key &&
      this.rAdresse.key;
  }

  // ---------------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------------

  private ensureRequiredMainContacts(): void {
    const adherent = this.adherent;
    if (!adherent) return;

    adherent.contact ??= [];

    if (!adherent.contact.some((c: ItemContact) => this.normalizeContactType((c as any)?.Type ?? (c as any)?.type) === 'EMAIL')) {
      adherent.contact.unshift(this.createContact('EMAIL'));
    }

    if (!adherent.contact.some((c: ItemContact) => this.normalizeContactType((c as any)?.Type ?? (c as any)?.type) === 'PHONE')) {
      adherent.contact.push(this.createContact('PHONE'));
    }
  }

  private createContact(type: ContactType, value = ''): ItemContact {
    return {
      Type: type,
      Pref: type === 'EMAIL',
      Value: value,
      Info: '',
      id: 0,
      Diffusion: type === 'EMAIL',
    };
  }

  private cloneContact(raw: any, preserveId: boolean): ItemContact {
    const type = this.normalizeContactType(
      raw?.Type ?? raw?.type ?? raw?.contact_type ?? raw?.contactType
    );
    const value = this.asText(
      raw?.Value ?? raw?.value ?? raw?.contact_value ?? raw?.contactValue
    ).trim();
    const normalizedValue = type === 'EMAIL' ? value.toLowerCase() : value;
    const rawId = Number(raw?.id ?? raw?.Id);

    return {
      Type: type,
      Pref: raw?.Pref ?? raw?.pref ?? false,
      Value: normalizedValue,
      Info: this.asText(raw?.Info ?? raw?.info),
      id: preserveId && Number.isFinite(rawId) && rawId > 0 ? rawId : 0,
      Diffusion: type === 'EMAIL' ? Boolean(raw?.Diffusion ?? raw?.diffusion ?? true) : false,
    };
  }

  private cloneAdresse(raw: any, preserveId: boolean): Adresse {
    const source = this.parseJsonValue(raw) ?? {};
    const adresse = Object.assign(new Adresse(), source);

    adresse.Street = this.asText(source.Street ?? source.street);
    adresse.PostCode = this.asText(source.PostCode ?? source.postCode ?? source.post_code);
    adresse.City = this.asText(source.City ?? source.city);
    adresse.Country = this.asText(source.Country ?? source.country) || 'France';

    const adresseAny = adresse as any;
    const rawId = Number(source.id ?? source.Id);
    adresseAny.id = preserveId && Number.isFinite(rawId) && rawId > 0 ? rawId : 0;
    if ('Id' in adresseAny) adresseAny.Id = adresseAny.id;

    // Une adresse copiée ne doit jamais garder la relation vers la personne source.
    if (!preserveId) {
      if ('personne' in adresseAny) adresseAny.personne = null;
      if ('personne_id' in adresseAny) adresseAny.personne_id = null;
      if ('personneId' in adresseAny) adresseAny.personneId = null;
    }

    return adresse;
  }

  private parseJsonValue(value: any): any {
    if (typeof value !== 'string') return value;

    const text = value.trim();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return value;
    }
  }

  private normalizeContactType(value: unknown): ContactType {
    return this.asText(value).trim().toUpperCase() === 'PHONE' ? 'PHONE' : 'EMAIL';
  }

  private getRequiredEmailContact(): ItemContact | null {
    return (
      (this.adherent?.contact ?? []).find(
        (c: ItemContact) => this.normalizeContactType((c as any)?.Type ?? (c as any)?.type) === 'EMAIL'
      ) ?? null
    );
  }

  private getRequiredPhoneContact(): ItemContact | null {
    return (
      (this.adherent?.contact ?? []).find(
        (c: ItemContact) => this.normalizeContactType((c as any)?.Type ?? (c as any)?.type) === 'PHONE'
      ) ?? null
    );
  }

  private syncEmailContactFromAccount(force: boolean): void {
    const email = this.getCompteEmailCandidate();
    if (!email) return;
    this.syncEmailContactFromValue(email, force);
  }

  private syncEmailContactFromValue(email: string, force: boolean): void {
    const adherent = this.adherent;
    if (!adherent || !this.isValidEmail(email)) return;

    this.ensureRequiredMainContacts();

    let emailContact = this.getRequiredEmailContact();
    if (!emailContact) {
      emailContact = this.createContact('EMAIL', email);
      adherent.contact.unshift(emailContact);
    }

    if (force || !emailContact.Value?.trim()) {
      emailContact.Value = email.trim().toLowerCase();
      emailContact.Diffusion = true;
    }

    this.normalizePreferredContact();
  }

  private mergeContacts(
    current: ItemContact[],
    incoming: ItemContact[],
    preserveIncomingIds: boolean
  ): ItemContact[] {
    const result = (current ?? []).map((contact) => this.cloneContact(contact, true));

    for (const raw of incoming ?? []) {
      const candidate = this.cloneContact(raw, preserveIncomingIds);
      if (!candidate.Value?.trim()) continue;

      const duplicate = result.some(
        (existing) =>
          existing.Type === candidate.Type &&
          this.contactComparisonValue(existing) === this.contactComparisonValue(candidate)
      );
      if (duplicate) continue;

      const emptySameType = result.find(
        (existing) => existing.Type === candidate.Type && !existing.Value?.trim()
      );

      if (emptySameType) {
        const index = result.indexOf(emptySameType);
        result[index] = candidate;
      } else {
        result.push(candidate);
      }
    }

    return result;
  }

  private contactComparisonValue(contact: ItemContact): string {
    const value = this.asText(contact?.Value).trim().toLowerCase();
    return contact?.Type === 'PHONE' ? value.replace(/\D/g, '') : value;
  }

  addContact(type: ContactType = 'EMAIL'): void {
    const adherent = this.adherent;
    if (!adherent) return;

    adherent.contact = [...(adherent.contact ?? []), this.createContact(type)];
    this.normalizePreferredContact();
    this.checkall();
  }

  removeContact(index: number): void {
    const adherent = this.adherent;
    if (!adherent) return;

    adherent.contact = (adherent.contact ?? []).filter((_contact, i) => i !== index);
    this.ensureRequiredMainContacts();
    this.normalizePreferredContact();
    this.checkall();
  }

  public canRemoveContact(index: number): boolean {
    const contact = this.adherent?.contact?.[index];
    if (!contact) return false;

    const sameTypeCount = (this.adherent?.contact ?? []).filter(
      (c: ItemContact) => c.Type === contact.Type
    ).length;

    return sameTypeCount > 1;
  }

  public onContactTypeChange(contact: ItemContact, type: ContactType): void {
    contact.Type = type;
    contact.Diffusion = type === 'EMAIL';
    this.ensureRequiredMainContacts();
    this.normalizePreferredContact();
    this.commitNestedReferences();
    this.checkall();
  }

  public onContactPrevenirTypeChange(contact: ItemContact, type: ContactType): void {
    contact.Type = type;
    contact.Pref = false;
    contact.Diffusion = false;
    this.commitNestedReferences();
    this.checkall();
  }

  setPreferredContact(index: number): void {
    const adherent = this.adherent;
    if (!adherent) return;

    adherent.contact.forEach((c, i) => {
      c.Pref = i === index;
      if (i === index && c.Type === 'EMAIL' && c.Value?.trim()) c.Diffusion = true;
    });

    this.commitNestedReferences();
    this.checkall();
  }

  normalizePreferredContact(): void {
    const adherent = this.adherent;
    if (!adherent?.contact?.length) return;

    const validIndexes = adherent.contact
      .map((contact, index) => ({ contact, index }))
      .filter(({ contact }) => !!contact.Value?.trim());

    const preferredValid = validIndexes.find(({ contact }) => !!contact.Pref);
    const preferredIndex = preferredValid?.index ?? validIndexes[0]?.index ?? 0;

    adherent.contact.forEach((contact, index) => {
      contact.Pref = index === preferredIndex;
      if (contact.Type !== 'EMAIL') contact.Diffusion = false;
    });
  }

  private sanitizeEmergencyContacts(contacts: ItemContact[]): ItemContact[] {
    return (contacts ?? []).map((contact) => ({
      ...contact,
      Pref: false,
      Diffusion: false,
    }));
  }

  addContactPrevenir(type: ContactType = 'PHONE'): void {
    const adherent = this.adherent;
    if (!adherent) return;

    adherent.contact_prevenir = [
      ...(adherent.contact_prevenir ?? []),
      this.createContact(type),
    ];
  }

  removeContactPrevenir(index: number): void {
    const adherent = this.adherent;
    if (!adherent) return;

    adherent.contact_prevenir = (adherent.contact_prevenir ?? []).filter(
      (_contact, i) => i !== index
    );
    this.checkall();
  }

  getContactValue(contact: ItemContact): string {
    return contact?.Value ?? '';
  }

  setContactValue(contact: ItemContact, value: string): void {
    contact.Value = value ?? '';
    if (contact.Type === 'EMAIL') contact.Value = contact.Value.trim().toLowerCase();
    this.commitNestedReferences();
    this.checkall();
  }

  private isValidEmail(value: unknown): boolean {
    const email = this.asText(value).trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidPhone(value: unknown): boolean {
    const phone = this.asText(value).trim();
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }

  // ---------------------------------------------------------------------------
  // Actions adhérent
  // ---------------------------------------------------------------------------

  async deleteAdherent(): Promise<void> {
    const adherent = this.adherent;
    if (!adherent?.id) return;

    const confirmDelete = window.confirm($localize`Voulez-vous supprimer cet adhérent ?`);
    if (!confirmDelete) return;

    await this.repository.deleteAdherent(adherent.id);
    this.back.emit();
  }

  toggleArchive(): void {
    const adherent = this.adherent;
    if (!adherent) return;

    const willArchive = !adherent.archive;
    const message = willArchive
      ? $localize`Voulez-vous archiver cet adhérent ?`
      : $localize`Voulez-vous désarchiver cet adhérent ?`;

    const confirmed = window.confirm(message);
    if (!confirmed) return;

    adherent.archive = willArchive;
  }

  // ---------------------------------------------------------------------------
  // Groupes / saison
  // ---------------------------------------------------------------------------

  hasInscriptionSaison(saisonId: number): boolean {
    return (this.adherent?.inscriptionsSaison ?? []).some(
      (x: InscriptionSaison) => x.saison_id === saisonId
    );
  }

  toggleGroupeForActiveSaison(groupeId: number): void {
    const adherent = this.adherent;
    const saisonId = this.activeSaisonId;

    if (!adherent || !saisonId) return;
    if (!this.hasInscriptionSaison(saisonId)) return;

    adherent.groupesParSaison ??= [];

    const groupesSelectionnes: LienGroupe_VM[] = adherent.groupesParSaison;

    const groupeRef = this.groupesDisponibles.find(
      (g: Groupe) => g.id === groupeId && g.saison_id === saisonId
    );

    if (!groupeRef) return;

    const existingIndex = groupesSelectionnes.findIndex(
      (g: LienGroupe_VM) => g.id === groupeId
    );

    if (existingIndex >= 0) {
      adherent.groupesParSaison = groupesSelectionnes.filter((_g, index) => index !== existingIndex);
      return;
    }

    const newLink = new LienGroupe_VM(groupeRef.id, groupeRef.nom, 0);
    adherent.groupesParSaison = [...groupesSelectionnes, newLink];
  }

  hasGroupeActiveSaison(groupeId: number): boolean {
    return (this.adherent?.groupesParSaison ?? []).some(
      (gg: LienGroupe_VM) => gg.id === groupeId
    );
  }

  GroupeDansSaison(groupeId: number, saisonId?: number): Groupe | null {
    const activeSaisonId = saisonId || this.activeSaisonId;
    if (!activeSaisonId) return null;

    return (
      this.groupesDisponibles.find(
        (g: Groupe) => g.id === groupeId && g.saison_id === activeSaisonId
      ) ?? null
    );
  }

  getGroupesLabelForSaison(): string {
    const labels: string[] = [];

    for (const g of this.adherent?.groupesParSaison ?? []) {
      const groupe = this.GroupeDansSaison(g.id);
      if (groupe) labels.push(groupe.nom);
    }

    return labels.join(', ');
  }

  // ---------------------------------------------------------------------------
  // Divers
  // ---------------------------------------------------------------------------

  getSexeLabel(value: boolean | null | undefined): string {
    if (value === null || value === undefined) return '';
    return value ? 'Homme' : 'Femme';
  }

  getSaisonLabel(saisonId: number): string {
    return this.saisonsDisponibles.find((x: Saison) => x.id === saisonId)?.nom ?? `Saison ${saisonId}`;
  }

  getSortedInscriptionsSaison(): InscriptionSaison[] {
    return [...(this.adherent?.inscriptionsSaison ?? [])].sort(
      (a: InscriptionSaison, b: InscriptionSaison) => {
        const aId = a.saison_id ?? 0;
        const bId = b.saison_id ?? 0;
        return bId - aId;
      }
    );
  }

  isSaisonActive(saisonId: number): boolean {
    return this.activeSaisonId === saisonId;
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackBySaison = (_index: number, item: InscriptionSaison): number => {
    return item.saison_id ?? _index;
  };

  get photoPreview(): string | null {
    return this.adherent?.photo ?? null;
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || !this.adherent) return;

    if (!file.type.startsWith('image/')) {
      window.alert('Le fichier sélectionné doit être une image.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.adherent!.photo = reader.result as string;
    };

    reader.readAsDataURL(file);
  }

  removePhoto(): void {
    if (!this.adherent) return;
    this.adherent.photo = null;
  }
}

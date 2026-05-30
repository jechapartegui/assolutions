import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ValidationItem } from '@shared/lib/autres.interface';
import {
  AdherentDetail_VM,
  AdherentPageVm,
} from 'apps/assolutions-front/src/vm/adherent-page.vm';
import { AdherentRepository } from 'apps/assolutions-front/src/repository/adherent.repository';
import { AdherentStore } from 'apps/assolutions-front/src/store/adherent.store';
import { ErrorService } from 'apps/assolutions-front/src/services/error.service';
import { ItemContact } from '@shared/lib/personne.interface';
import {
  Adresse,
  Groupe,
  InscriptionSaison,
  LienGroupe_VM,
  Saison,
} from '@shared/index';
import { combineLatest, Subscription } from 'rxjs';
import { AppStore } from '../../app.store';
import { AddInfoEditorComponent } from '../../add-info-editor/add-info-editor.component';

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
  public rNom: ValidationItem = { key: true, value: '' };
  public rPrenom: ValidationItem = { key: true, value: '' };
  public loading = false;

  private routeSubscription?: Subscription;

  constructor(
    private readonly repository: AdherentRepository,
    private readonly store: AdherentStore,
    private readonly route: ActivatedRoute,
    private readonly appstore: AppStore
  ) {}

  get currentVm(): AdherentPageVm | null {
    return this.vm ?? this.store.vm();
  }

  get adherent(): AdherentDetail_VM | null {
    return this.currentVm?.editAdherent ?? null;
  }

  async ngOnInit(): Promise<void> {
    await this.initFromRouteIfNeeded();
    this.syncViewState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vm']) {
      this.syncViewState();
    }
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  private async initFromRouteIfNeeded(): Promise<void> {
    if (this.vm) {
      return;
    }

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
      this.syncViewState();
    });
  }

  private async tryLoadForRoute(id: number): Promise<void> {
    const saisonId = this.activeSaisonId;
    if (!saisonId) {
      return;
    }

    this.loading = true;

    try {
      await this.store.init(saisonId);
      await this.store.openAdherent(id, saisonId);
    } catch (err) {
      console.error('Chargement route adherent-edit impossible', err);
    } finally {
      this.loading = false;
    }
  }

  private syncViewState(): void {
    const adherent = this.adherent;
    if (!adherent) {
      return;
    }

    adherent.contact ??= [];
    adherent.contact_prevenir ??= [];
    adherent.inscriptionsSaison ??= [];
    adherent.inscriptionsSeance ??= [];
    adherent.groupesParSaison ??= [];
    adherent.adresse ??= new Adresse();
adherent.photo ??= null;
    this.normalizePreferredContact();
    this.checkall();
  }

  get dateNaissanceValue(): string {
    const raw = this.adherent?.date_naissance;
    if (!raw) return '';

    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  set dateNaissanceValue(value: string) {
    const adherent = this.adherent;
    if (!adherent) return;

    if (!value) {
      adherent.date_naissance = null;
      return;
    }

    adherent.date_naissance = new Date(`${value}T00:00:00`);
  }

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

  public get getEmailPrincipal(): string {
    const preferredMail = (this.adherent?.contact ?? []).find(
      (c: ItemContact) => c?.Type === 'EMAIL' && c.Pref
    );
    if (preferredMail) {
      return preferredMail.Value ?? '';
    }

    const firstMail = (this.adherent?.contact ?? []).find(
      (c: ItemContact) => c?.Type === 'EMAIL' && !!c.Value?.trim()
    );
    return firstMail ? firstMail.Value : '';
  }

  async save(): Promise<void> {
    const errorService = ErrorService.instance;
    const vm = this.currentVm;
    const adherent = this.adherent;
    this.forceCompteIfNeeded();

    this.checkall();

    if (!vm?.isValid || !adherent) {
      return;
    }

    try {
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
      const message =
        err instanceof Error
          ? err.message
          : $localize`Erreur inconnue`;

      errorService.emitChange(
        errorService.CreateError(
          $localize`Sauvegarder l'adhérent`,
          message
        )
      );
    }
  }
  canEditCompte(): boolean {
  return this.isAdmin === true || this.appstore.isProf() === true;
}

private forceCompteIfNeeded(): void {
  const adherent = this.currentVm?.editAdherent;
  const compte = this.appstore.compte?.();

  if (!adherent || !compte) return;

  if (!this.canEditCompte()) {
    adherent.compte = compte.id;
  }
}

  async deleteAdherent(): Promise<void> {
    const adherent = this.adherent;
    if (!adherent?.id) return;

    const confirmDelete = window.confirm(
      $localize`Voulez-vous supprimer cet adhérent ?`
    );
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

  checkall(): void {
    const adherent = this.adherent;
    const vm = this.currentVm;

    this.rNom = { key: true, value: '' };
    this.rPrenom = { key: true, value: '' };

    if (!adherent || !vm) {
      return;
    }

    if (!adherent.nom || !adherent.nom.trim()) {
      this.rNom = { key: false, value: $localize`Le nom doit être saisi` };
    } else if (adherent.nom.trim().length < 2) {
      this.rNom = {
        key: false,
        value: $localize`Le nom doit faire au moins 2 caractères`,
      };
    }

    if (!adherent.prenom || !adherent.prenom.trim()) {
      this.rPrenom = { key: false, value: $localize`Le prénom doit être saisi` };
    } else if (adherent.prenom.trim().length < 2) {
      this.rPrenom = {
        key: false,
        value: $localize`Le prénom doit faire au moins 2 caractères`,
      };
    }

    vm.isValid = this.rNom.key && this.rPrenom.key;
  }

addContact(type: string = 'EMAIL'): void {
  const adherent = this.adherent;
  if (!adherent) return;

  const item: ItemContact = {
    Type: type,
    Pref: adherent.contact.length === 0,
    Value: '',
    Info: '',
    id: 0,
    Diffusion: type === 'EMAIL',
  };

  adherent.contact.push(item);
  this.normalizePreferredContact();
}

  removeContact(index: number): void {
    const adherent = this.adherent;
    if (!adherent) return;

    adherent.contact.splice(index, 1);
    this.normalizePreferredContact();
  }

setPreferredContact(index: number): void {
  const adherent = this.adherent;
  if (!adherent) return;

  adherent.contact.forEach((c, i) => {
    c.Pref = i === index;

    if (i === index && c.Type === 'EMAIL' && c.Value?.trim()) {
      c.Diffusion = true;
    }
  });
}

  normalizePreferredContact(): void {
    const adherent = this.adherent;
    if (!adherent?.contact?.length) return;

    const hasPref = adherent.contact.some((c) => c.Pref);
    if (!hasPref) {
      adherent.contact[0].Pref = true;
    }
  }

  addContactPrevenir(type: string = 'PHONE'): void {
    const adherent = this.adherent;
    if (!adherent) return;

    const item: ItemContact = {
      Type: type,
      Pref: false,
      Value: '',
      Info: '',
      id: 0,
      Diffusion: true,
    };

    adherent.contact_prevenir.push(item);
  }

  removeContactPrevenir(index: number): void {
    const adherent = this.adherent;
    if (!adherent) return;

    adherent.contact_prevenir.splice(index, 1);
  }

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
      adherent.groupesParSaison = groupesSelectionnes.filter(
        (_g, index) => index !== existingIndex
      );
      return;
    }

    const newLink = new LienGroupe_VM(
      groupeRef.id,
      groupeRef.nom,
      0
    );

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

    const groupe =
      this.groupesDisponibles.find(
        (g: Groupe) => g.id === groupeId && g.saison_id === activeSaisonId
      ) ?? null;

    return groupe;
  }

  getGroupesLabelForSaison(): string {
    for (const g of this.adherent?.groupesParSaison ?? []) {
      const groupe = this.GroupeDansSaison(g.id);
      if (groupe) {
        return groupe.nom;
      }
    }
    return '';
  }

  getSexeLabel(value: boolean | null | undefined): string {
    if (value === null || value === undefined) return '';
    return value ? 'Homme' : 'Femme';
  }

  getSaisonLabel(saisonId: number): string {
    return (
      this.saisonsDisponibles.find((x: Saison) => x.id === saisonId)?.nom ??
      `Saison ${saisonId}`
    );
  }

  getContactValue(contact: ItemContact): string {
    return contact?.Value ?? '';
  }

  setContactValue(contact: ItemContact, value: string): void {
    contact.Value = value;
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
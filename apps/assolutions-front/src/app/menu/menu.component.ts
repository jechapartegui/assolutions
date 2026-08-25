import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  InscriptionStatus_VM,
  MailAddressVm,
  MesSeances_VM,
  OutgoingMessageVm,
  Project,
  Seance_VM,
  StatutSeance,
  calculerHeureFin as calculerHeureFinUtil,
} from '@shared/index';

import { AdherentMenu } from '../../class/adherent-menu';
import { MultifiltersMenuPipe } from '../../filters/multifilters-menu.pipe';
import { MenuRepository } from '../../repository/menu.repository';
import { ErrorService } from '../../services/error.service';
import { MessageApiService } from '../../services/message-api.service';
import { ProjectApiService } from '../../services/project-api.service';
import { MenuStore } from '../../store/menu.store';
import { AppStore } from '../app.store';
import { StaticClass } from '../global';

@Component({
  standalone: false,
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css'],
})
export class MenuComponent implements OnInit, OnDestroy {
  @ViewChild('scrollableContent', { static: false })
  scrollableContent?: ElementRef<HTMLElement>;

  public g!: StaticClass;
  public loading = false;
  public showScrollToTop = false;
  public denseMode = false;
  public showContactClub = false;
  public contactClubMessage = '';
  public action = '';

  private boundOnContentScroll = this.onContentScroll.bind(this);

  constructor(
    public readonly store: AppStore,
    public readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    public readonly menuStore: MenuStore,
    private readonly menuRepository: MenuRepository,
    private readonly messageservice: MessageApiService,
    private readonly multifiltersPipe: MultifiltersMenuPipe,
    private readonly projectapi: ProjectApiService,
  ) {}

  get Riders(): AdherentMenu[] {
    return this.menuStore.vm().riders;
  }

  get anniversaire(): string[] {
    return this.menuStore.vm().anniversaire;
  }

  get listeprof() {
    return this.menuStore.vm().listeprof;
  }

  get listelieu() {
    return this.menuStore.vm().listelieu;
  }

  get listegroupe() {
    return this.menuStore.vm().listegroupe;
  }

  get listeCours() {
    return this.menuStore.vm().listeCours;
  }

  get liste_prof_filter() {
    return this.menuStore.vm().liste_prof_filter;
  }

  get liste_lieu_filter() {
    return this.menuStore.vm().liste_lieu_filter;
  }

  get liste_groupe_filter() {
    return this.menuStore.vm().liste_groupe_filter;
  }

  get liste_cours_filter() {
    return this.menuStore.vm().liste_cours_filter;
  }

  get refreshAvailable(): boolean {
    return this.menuStore.vm().refreshAvailable;
  }

  async ngOnInit(): Promise<void> {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger le menu`;

    if (this.store.mode() === 'ADMIN') {
      this.router.navigate(['/menu-admin']);
      return;
    }

    this.loading = true;

    try {
      const selectedProject = this.store.selectedProject();
      if (!selectedProject) {
        errorService.emitChange(
          errorService.CreateError(this.action, $localize`Aucun projet sélectionné`),
        );
        return;
      }

      const projectId = selectedProject.id;
      const saisonId = this.store.saison_active_id();
      const rights = selectedProject.rights;

      await this.menuStore.init(projectId, saisonId, rights);
    } catch (err: any) {
      errorService.emitChange(
        errorService.CreateError(
          this.action,
          $localize`chargement du menu : ` + err?.message,
        ),
      );
    } finally {
      this.loading = false;
      this.updateDenseMode();
      window.addEventListener('resize', this.updateDenseMode);
    }
  }

  ngAfterViewInit(): void {
    this.bindScrollContainer();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.updateDenseMode);
    this.scrollableContent?.nativeElement.removeEventListener(
      'scroll',
      this.boundOnContentScroll,
    );
  }

  private bindScrollContainer(): void {
    setTimeout(() => {
      const el = this.scrollableContent?.nativeElement;
      if (!el) return;

      el.removeEventListener('scroll', this.boundOnContentScroll);
      el.addEventListener('scroll', this.boundOnContentScroll);
      this.onContentScroll();
    });
  }

  onContentScroll(): void {
    const el = this.scrollableContent?.nativeElement;
    if (!el) {
      this.showScrollToTop = false;
      return;
    }

    this.showScrollToTop = (el.scrollTop || 0) > 200;
  }

  getInitiales(personne: AdherentMenu): string {
    const prenom = (personne.prenom ?? '').trim();
    const nom = (personne.nom ?? '').trim();
    const surnom = (personne.surnom ?? '').trim();

    const first = prenom.charAt(0) || surnom.charAt(0) || '';
    const last = nom.charAt(0) || '';

    const value = `${first}${last}`.trim().toUpperCase();
    return value || '?';
  }

  applyRefresh(): void {
    this.menuStore.applyRefresh();
  }

  toggleContactClub(): void {
    this.showContactClub = !this.showContactClub;
  }

  async MAJInscription(
    ms: MesSeances_VM,
    rider: AdherentMenu,
    present: boolean | null,
  ): Promise<void> {
    // Le bouton individuel "essai" utilise historiquement cette méthode.
    // On conserve ce contrat d'UI, mais le bulk filtre les essais avant appel.
    if (present === true && this.isEssaiPossible(ms, rider)) {
      await this.demanderEssai(ms, rider);
      return;
    }

    if (present === true && ms?.accesInscription !== true) {
      return;
    }

    let statutInscription: InscriptionStatus_VM | null = null;

    if (present === true) {
      statutInscription = InscriptionStatus_VM.PRESENT;
    } else if (present === false) {
      statutInscription = InscriptionStatus_VM.ABSENT;
    }

    await this.menuRepository.updateInscription(
      ms.seance.id,
      rider.id,
      statutInscription,
    );
    this.menuStore.patchLocalInscription(
      rider.id,
      (ms.seance as Seance_VM).id,
      statutInscription,
    );
  }

  async demanderEssai(ms: MesSeances_VM, rider: AdherentMenu): Promise<void> {
    if (!this.isEssaiPossible(ms, rider)) return;

    const confirme = window.confirm(
      `Confirmez-vous la demande de séance d'essai pour ${rider.prenom} ${rider.nom} ?\n\n` +
        `${ms.seance.nom || ms.seance.cours_nom} - ${new Date(ms.seance.date_seance).toLocaleDateString('fr-FR')} à ${ms.seance.heure_debut}`,
    );
    if (!confirme) return;

    await this.menuRepository.updateInscription(
      ms.seance.id,
      rider.id,
      InscriptionStatus_VM.ESSAI,
    );
    this.menuStore.patchLocalInscription(
      rider.id,
      (ms.seance as Seance_VM).id,
      InscriptionStatus_VM.ESSAI,
    );

    await this.sendEssaiConfirmation(ms, rider);
    ErrorService.instance.emitChange(
      ErrorService.instance.OKMessage($localize`Votre demande d'essai est enregistrée.`),
    );
  }

  isEssai(ms: MesSeances_VM): boolean {
    return ms?.statutInscription === InscriptionStatus_VM.ESSAI;
  }

  isEssaiPossible(ms: MesSeances_VM, rider: AdherentMenu): boolean {
    return (
      rider?.profil === 'ADH' &&
      rider?.inscrit !== true &&
      ms?.essaiDisponible === true &&
      !ms?.statutInscription
    );
  }

  hasEssaiPossible(rider: AdherentMenu): boolean {
    return (
      rider?.profil === 'ADH' &&
      rider?.inscrit !== true &&
      (rider.MesSeances ?? []).some((ms) => this.isEssaiPossible(ms, rider))
    );
  }

  private async sendEssaiConfirmation(
    ms: MesSeances_VM,
    rider: AdherentMenu,
  ): Promise<void> {
    const email = this.store.compte()?.login;
    if (!email) return;

    try {
      await this.messageservice.send({
        to: {
          email,
          name: `${rider.prenom ?? ''} ${rider.nom ?? ''}`.trim() || email,
        },
        subject: `Confirmation de séance d'essai - ${ms.seance.nom || ms.seance.cours_nom}`,
        html: `<p>Bonjour,</p><p>La demande de séance d'essai pour <strong>${rider.prenom ?? ''} ${rider.nom ?? ''}</strong> est bien enregistrée.</p><p><strong>${ms.seance.nom || ms.seance.cours_nom}</strong><br>${new Date(ms.seance.date_seance).toLocaleDateString('fr-FR')} à ${ms.seance.heure_debut}<br>${ms.seance.lieu_nom ?? ''}</p><p>Le club dispose désormais de cette information dans la feuille de présence.</p>`,
      });
    } catch (error) {
      ErrorService.instance.emitChange(
        ErrorService.instance.CreateError(
          $localize`Envoyer la confirmation d'essai`,
          error,
        ),
      );
    }
  }

  hasOpenedRider(): boolean {
    return this.Riders.some((x) => !!x.afficher);
  }

  getLibelleProfil(profil: string): string {
    if (profil === 'ADH') return 'Adhérent';
    if (profil === 'PROF') return 'Professeur';
    return profil;
  }

  ReinitFiltre(rider: AdherentMenu): void {
    rider.filters.filter_date_apres = null;
    rider.filters.filter_date_avant = null;
    rider.filters.filter_groupe =
      rider.profil === 'ADH' && rider.inscrit ? '__MES_GROUPES__' : null;
    rider.filters.filter_statut = null;
    rider.filters.filter_nom = null;
    rider.filters.filter_cours = null;
    rider.filters.filter_lieu = null;
    rider.filters.filter_prof = null;
  }

  nbSeanceInscrit(
    list: MesSeances_VM[],
  ): { OK: number; KO: number; aucun: number } {
    const r = { OK: 0, KO: 0, aucun: 0 };

    for (const x of list ?? []) {
      if (
        x.statutInscription === 'présent' ||
        x.statutInscription === 'essai'
      ) {
        r.OK++;
      } else if (x.statutInscription === 'absent') {
        r.KO++;
      } else {
        r.aucun++;
      }
    }

    return r;
  }

  scrollToTop(): void {
    this.scrollableContent?.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  readonly updateDenseMode = () => {
    this.denseMode = window.innerWidth <= 1023;
    this.cdr.markForCheck();
  };

  Voir(id: number): void {
    this.router.navigate(['/adherent'], {
      queryParams: {
        id,
        context: 'MON_COMPTE',
      },
    });
  }

  VoirMaSeance(seance: any): void {
    this.router.navigate(['/ma-seance'], { queryParams: { id: seance.id } });
  }

  Sort(
    order: 'ASC' | 'DESC',
    type: 'nom' | 'date' | 'statut' | 'prof' | 'lieu',
    rider: AdherentMenu,
  ): void {
    if (!rider?.MesSeances?.length) return;

    if (type === 'nom') {
      rider.sort_nom = order;
      rider.MesSeances.sort((a, b) =>
        order === 'ASC'
          ? ((a.seance as any)?.cours_nom ?? '').localeCompare(
              (b.seance as any)?.cours_nom ?? '',
              'fr',
            )
          : ((b.seance as any)?.cours_nom ?? '').localeCompare(
              (a.seance as any)?.cours_nom ?? '',
              'fr',
            ),
      );
      return;
    }

    if (type === 'date') {
      rider.sort_date = order;
      rider.MesSeances.sort((a, b) => {
        const da = `${(a.seance as any)?.date_seance ?? (a.seance as any)?.date ?? ''} ${(a.seance as any)?.heure_debut ?? ''}`;
        const db = `${(b.seance as any)?.date_seance ?? (b.seance as any)?.date ?? ''} ${(b.seance as any)?.heure_debut ?? ''}`;
        return order === 'ASC'
          ? da.localeCompare(db, 'fr')
          : db.localeCompare(da, 'fr');
      });
      return;
    }

    if (type === 'lieu') {
      rider.sort_lieu = order;
      rider.MesSeances.sort((a, b) =>
        order === 'ASC'
          ? ((a.seance as any)?.lieu_nom ?? '').localeCompare(
              (b.seance as any)?.lieu_nom ?? '',
              'fr',
            )
          : ((b.seance as any)?.lieu_nom ?? '').localeCompare(
              (a.seance as any)?.lieu_nom ?? '',
              'fr',
            ),
      );
    }
  }

  GotoSeance(seanceId: number): void {
    if (this.store.isAdmin() || this.store.isProf()) {
      this.router.navigate(['/seance'], { queryParams: { id: seanceId } });
    }
  }

  getadresse(lieuId: number): string {
    const lieu = this.listelieu.find((x: any) => x.id === lieuId);
    if (!lieu) return '';

    if (typeof lieu.adresse === 'string') {
      return lieu.adresse;
    }

    if (lieu.adresse) {
      const a: any = lieu.adresse;
      return [
        a.adresse1,
        a.adresse2,
        a.adresse3,
        a.code_postal,
        a.ville,
      ]
        .filter((x) => !!x)
        .join(' ');
    }

    return '';
  }

  calculerHeureFin(heureDebut: string, duree: number): string {
    return calculerHeureFinUtil(heureDebut, duree);
  }

  copierDansPressePapier(texte: string): void {
    if (!texte) return;

    navigator.clipboard?.writeText(texte).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = texte;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textarea);
      }
    });
  }

  async MAJInscriptionAffichee(
    rider: AdherentMenu,
    present: boolean | null,
  ): Promise<void> {
    let visibles = (rider.MesSeances ?? []).filter((ms: MesSeances_VM) => {
      if (!rider.filters) return true;
      return this.multifiltersPipe.transform([ms], rider.filters).length > 0;
    });

    // L'acceptation de masse reste strictement limitée aux séances des groupes
    // actuels de l'adhérent. Les séances d'essai et autres groupes sont exclues.
    if (present === true && rider.profil === 'ADH') {
      visibles = visibles.filter(
        (ms) =>
          rider.inscrit === true &&
          ms.dansGroupeAdherent === true &&
          !this.isEssai(ms) &&
          !this.isEssaiPossible(ms, rider) &&
          ms.accesInscription === true,
      );
    }

    for (const ms of visibles) {
      await this.MAJInscription(ms, rider, present);
    }
  }

  annulerContactClub(): void {
    this.showContactClub = false;
    this.contactClubMessage = '';
  }

  async envoyerContactClub(): Promise<void> {
    const msg = (this.contactClubMessage || '').trim();
    const errorService = ErrorService.instance;

    if (!msg) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Contacter le club`,
          $localize`Le message est vide.`,
        ),
      );
      return;
    }

    const selectedProject = this.store.selectedProject();

    if (!selectedProject?.id) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Contacter le club`,
          $localize`Aucun club sélectionné.`,
        ),
      );
      return;
    }

    const MAVM: Project = await this.projectapi.get(selectedProject.id);

    if (!MAVM?.login) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Contacter le club`,
          $localize`Adresse email du club introuvable.`,
        ),
      );
      return;
    }

    const to: MailAddressVm = {
      email: MAVM.login,
      name: MAVM.nom ?? MAVM.login,
    };

    const outgoingmsg: OutgoingMessageVm = {
      to,
      subject: $localize`Message depuis l'application`,
      html: msg,
    };

    await this.messageservice.send(outgoingmsg);

    errorService.emitChange(
      errorService.OKMessage($localize`Message envoyé au club.`),
    );

    this.annulerContactClub();
  }

  AfficherProfil(rider: AdherentMenu): void {
    for (const r of this.Riders) {
      if (r.id === rider.id && r.profil === rider.profil) {
        r.afficher = !r.afficher;
      } else {
        r.afficher = false;
      }
    }

    this.cdr.detectChanges();
    this.bindScrollContainer();
  }
}

export class FilterMenu {
  private _filter_date_apres: Date | null = null;
  get filter_date_apres(): Date | null {
    return this._filter_date_apres;
  }
  set filter_date_apres(value: Date | null) {
    this._filter_date_apres = value;
    this.onFilterChange();
  }

  private _filter_date_avant: Date | null = null;
  get filter_date_avant(): Date | null {
    return this._filter_date_avant;
  }
  set filter_date_avant(value: Date | null) {
    this._filter_date_avant = value;
    this.onFilterChange();
  }

  private _filter_nom: string | null = null;
  get filter_nom(): string | null {
    return this._filter_nom;
  }
  set filter_nom(value: string | null) {
    this._filter_nom = value;
    this.onFilterChange();
  }

  private _filter_cours: string | null = null;
  get filter_cours(): string | null {
    return this._filter_cours;
  }
  set filter_cours(value: string | null) {
    this._filter_cours = value;
    this.onFilterChange();
  }

  private _filter_groupe: string | null = null;
  get filter_groupe(): string | null {
    return this._filter_groupe;
  }
  set filter_groupe(value: string | null) {
    this._filter_groupe = value;
    this.onFilterChange();
  }

  private _filter_lieu: string | null = null;
  get filter_lieu(): string | null {
    return this._filter_lieu;
  }
  set filter_lieu(value: string | null) {
    this._filter_lieu = value;
    this.onFilterChange();
  }

  private _filter_statut: StatutSeance | null = StatutSeance.prévue;
  get filter_statut(): StatutSeance | null {
    return this._filter_statut;
  }
  set filter_statut(value: StatutSeance | null) {
    this._filter_statut = value;
    this.onFilterChange();
  }

  private _filter_prof: string | null = null;
  get filter_prof(): string | null {
    return this._filter_prof;
  }
  set filter_prof(value: string | null) {
    this._filter_prof = value;
    this.onFilterChange();
  }

  private onFilterChange(): void {
    // Le pipe est impure et relit directement l'état du filtre.
  }
}

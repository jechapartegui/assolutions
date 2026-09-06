import { Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { StaticClass } from './global';
import { NotifJechaComponent } from './custom-notification/custom-notification.component';
import { environment } from '../environments/environment.prod';
import { ErrorService } from '../services/error.service';
import { NavigationEnd, Router } from '@angular/router';
import { AppStore } from './app.store';
import { distinctUntilChanged, filter, map, startWith, Subscription } from 'rxjs';
import { MenuType } from '../store/session.store';

type HelpAudience = 'USER' | 'PROF' | 'ADMIN';

type HelpTopic = {
  key: string;
  label: string;
  audience: HelpAudience;
  url: string;
};

type AdminPageMeta = {
  title: string;
  description: string;
  icon: string;
};

@Component({
  standalone: false,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'AsSolutions';
  action!: string;
  isactive = false;
  helpOpen = false;
  g: StaticClass;
  search_text = '';
  envt = environment;
  isPublic = false;
  defaultProjectLabel = $localize`Projet`;
  adminPageMeta: AdminPageMeta | null = null;

  private readonly adminPageMetadata: Record<string, AdminPageMeta> = {
    '/adherent': {
      title: 'Adhérents',
      description: 'Rechercher, créer et mettre à jour les personnes suivies par le club.',
      icon: 'fa-users',
    },
    '/inscription': {
      title: "Tarifs d'inscription",
      description: 'Configurer les offres, tarifs et règles proposés pendant le parcours d’inscription.',
      icon: 'fa-tags',
    },
    '/suivi-inscriptions': {
      title: 'Suivi des inscriptions',
      description: 'Diagnostiquer les dossiers, paiements, finalisations et éventuelles incohérences du tunnel.',
      icon: 'fa-route',
    },
    '/codes-promo': {
      title: 'Codes promotionnels',
      description: 'Créer et administrer les réductions utilisables pendant une inscription.',
      icon: 'fa-ticket',
    },
    '/exigences-dossier': {
      title: 'Exigences des dossiers',
      description: 'Définir les pièces et validations attendues selon les groupes et les licences.',
      icon: 'fa-list-check',
    },
    '/cours': {
      title: 'Cours',
      description: 'Organiser les séries récurrentes qui servent de base aux séances de la saison.',
      icon: 'fa-chalkboard-user',
    },
    '/seance': {
      title: 'Séances',
      description: 'Consulter et ajuster les séances, leurs groupes, leurs encadrants et leurs participants.',
      icon: 'fa-calendar-days',
    },
    '/groupe': {
      title: 'Groupes',
      description: 'Structurer les adhérents et définir les critères d’accès aux activités du club.',
      icon: 'fa-layer-group',
    },
    '/contrat-prof': {
      title: 'Contrats professeurs',
      description: 'Suivre les engagements des encadrants pour la saison consultée.',
      icon: 'fa-file-signature',
    },
    '/stock': {
      title: 'Stocks',
      description: 'Gérer le matériel, sa localisation et les quantités constatées lors des inventaires.',
      icon: 'fa-boxes-stacked',
    },
    '/comptabilite': {
      title: 'Finances',
      description: 'Piloter le budget, les flux financiers et la situation comptable du club.',
      icon: 'fa-chart-pie',
    },
    '/operations': {
      title: 'Opérations',
      description: 'Consulter et rapprocher les opérations financières enregistrées dans Assolutions.',
      icon: 'fa-right-left',
    },
    '/envoi-mail': {
      title: 'Envoyer des mails',
      description: 'Préparer une communication et sélectionner ses destinataires selon le contexte du club.',
      icon: 'fa-paper-plane',
    },
    '/projet-mail': {
      title: 'Configuration mails',
      description: 'Configurer les modèles et paramètres utilisés par les communications automatiques.',
      icon: 'fa-envelope-circle-check',
    },
    '/suivi-mails': {
      title: 'Suivi des mails',
      description: 'Contrôler les envois effectués et identifier rapidement les éventuelles erreurs.',
      icon: 'fa-chart-line',
    },
    '/saison': {
      title: 'Saisons',
      description: 'Créer les saisons du club et choisir celle qui sert de référence à l’activité courante.',
      icon: 'fa-calendar',
    },
    '/lieu': {
      title: 'Lieux',
      description: 'Maintenir les gymnases, salles et autres lieux utilisés par les activités du club.',
      icon: 'fa-location-dot',
    },
    '/professeur': {
      title: 'Professeurs',
      description: 'Gérer les encadrants et les informations nécessaires à leur activité dans le club.',
      icon: 'fa-person-chalkboard',
    },
    '/compte-bancaire': {
      title: 'Comptes bancaires',
      description: 'Référencer les comptes utilisés pour le suivi des paiements et des opérations.',
      icon: 'fa-building-columns',
    },
    '/addinfo-listes': {
      title: 'Champs complémentaires',
      description: 'Créer les informations propres au club et administrer les valeurs proposées par les listes.',
      icon: 'fa-table-list',
    },
  };

  readonly helpTopics: HelpTopic[] = [
    { key: 'user-mon-compte', label: $localize`Mon compte`, audience: 'USER', url: '/tutos/01_Aide_utilisateur_Mon_compte.pdf' },
    { key: 'user-personne', label: $localize`Créer ou modifier une personne`, audience: 'USER', url: '/tutos/02_Aide_utilisateur_Personne.pdf' },
    { key: 'user-inscription', label: $localize`Inscription et paiement`, audience: 'USER', url: '/tutos/03_Aide_utilisateur_Inscription_et_paiement.pdf' },
    { key: 'user-seances', label: $localize`Séances, présences et essais`, audience: 'USER', url: '/tutos/04_Aide_utilisateur_Seances_et_essais.pdf' },
    { key: 'prof-adherents', label: $localize`Gérer les adhérents`, audience: 'PROF', url: '/tutos/01_Aide_prof_Adherents.pdf' },
    { key: 'prof-groupes', label: $localize`Gérer les groupes`, audience: 'PROF', url: '/tutos/02_Aide_prof_Groupes.pdf' },
    { key: 'prof-cours-seances', label: $localize`Cours et séances`, audience: 'PROF', url: '/tutos/03_Aide_prof_Cours_et_seances.pdf' },
    { key: 'prof-piloter-seance', label: $localize`Piloter une séance`, audience: 'PROF', url: '/tutos/04_Aide_prof_Piloter_une_seance.pdf' },
    { key: 'admin-centre-pilotage', label: $localize`Centre de pilotage`, audience: 'ADMIN', url: '/tutos/01_Aide_admin_Centre_de_pilotage.pdf' },
    { key: 'admin-saisons', label: $localize`Gérer les saisons`, audience: 'ADMIN', url: '/tutos/02_Aide_admin_Saisons.pdf' },
    { key: 'admin-tarifs', label: $localize`Tarifs d’inscription`, audience: 'ADMIN', url: '/tutos/03_Aide_admin_Tarifs_inscription.pdf' },
    { key: 'admin-codes-promo', label: $localize`Codes promotionnels`, audience: 'ADMIN', url: '/tutos/04_Aide_admin_Codes_promotionnels.pdf' },
    { key: 'admin-exigences', label: $localize`Exigences des dossiers`, audience: 'ADMIN', url: '/tutos/05_Aide_admin_Exigences_dossiers.pdf' },
    { key: 'admin-professeurs-contrats', label: $localize`Professeurs et contrats`, audience: 'ADMIN', url: '/tutos/06_Aide_admin_Professeurs_et_contrats.pdf' },
    { key: 'admin-lieux', label: $localize`Gérer les lieux`, audience: 'ADMIN', url: '/tutos/07_Aide_admin_Lieux.pdf' },
    { key: 'admin-finances', label: $localize`Gérer les finances`, audience: 'ADMIN', url: '/tutos/08_Aide_admin_Finances.pdf' },
    { key: 'admin-communication', label: $localize`Communication`, audience: 'ADMIN', url: '/tutos/09_Aide_admin_Communication.pdf' },
  ];

  @ViewChild(NotifJechaComponent, { static: true })
  child!: NotifJechaComponent;

  private sub?: Subscription;

  constructor(
    public erroservice: ErrorService,
    public globals: StaticClass,
    public router: Router,
    public store: AppStore,
  ) {
    this.g = globals;
    erroservice.changeEmitted$.subscribe((data) => this.DisplayError(data));
  }

  get visibleHelpTopics(): HelpTopic[] {
    if (this.store.isAdmin()) return this.helpTopics.filter((topic) => topic.audience === 'ADMIN');
    if (this.store.isProf()) {
      return this.helpTopics.filter((topic) => topic.audience === 'USER' || topic.audience === 'PROF');
    }
    return this.helpTopics.filter((topic) => topic.audience === 'USER');
  }

  get showAdminPageMeta(): boolean {
    return !this.isPublic && this.store.isAdmin() && !!this.adminPageMeta;
  }

  ngOnInit(): void {
    this.sub = this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map((e) => e.urlAfterRedirects.toLowerCase()),
        startWith(this.router.url.toLowerCase()),
        distinctUntilChanged(),
      )
      .subscribe((url) => {
        this.isPublic = this.isPublicUrl(url);
        this.adminPageMeta = this.resolveAdminPageMeta(url);
        this.helpOpen = false;
      });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private resolveAdminPageMeta(url: string): AdminPageMeta | null {
    const path = String(url ?? '').split('?')[0].split('#')[0];
    if (!path || path === '/menu-admin' || path === '/admin-projet') return null;
    return this.adminPageMetadata[path] ?? null;
  }

  private isPublicUrl(url: string): boolean {
    const hasPublicSuffix = /(^|\/)[^?#]*-public(\/|$|\?)/.test(url);
    const inPublicSegment = /(^|\/)public(\/|$|\?)/.test(url);
    const embedParam = url.includes('embed=1');
    return hasPublicSuffix || inPublicSegment || embedParam;
  }

  isact(): void { this.isactive = !this.isactive; }
  closeMenu(): void { this.isactive = false; }
  selectMenu(menu: MenuType): void { this.store.updateSelectedMenu(menu); this.closeMenu(); }

  toggleHelp(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.helpOpen = !this.helpOpen;
  }

  openHelpTopic(_topic: HelpTopic, event?: Event): void {
    event?.stopPropagation();
    this.helpOpen = false;
  }

  @HostListener('document:click') closeHelp(): void { this.helpOpen = false; }
  @HostListener('document:keydown.escape') closeHelpOnEscape(): void { this.helpOpen = false; }

  LogOut(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Se déconnecter`;
    this.store.clearSession();
    this.router.navigate(['/login']);
    errorService.emitChange(errorService.OKMessage(this.action));
  }

  Dashboard(): void {
    this.action = $localize`Afficher le tableau de bord`;
    this.router.navigate(['tdb']);
    this.closeMenu();
  }

  DisplayError(val: any): void { this.child.display_notification(val); }
}

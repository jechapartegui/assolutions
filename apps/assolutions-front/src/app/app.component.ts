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

  readonly helpTopics: HelpTopic[] = [
    // Utilisateur
    {
      key: 'user-mon-compte',
      label: $localize`Mon compte`,
      audience: 'USER',
      url: '/tutos/01_Aide_utilisateur_Mon_compte.pdf',
    },
    {
      key: 'user-personne',
      label: $localize`Créer ou modifier une personne`,
      audience: 'USER',
      url: '/tutos/02_Aide_utilisateur_Personne.pdf',
    },
    {
      key: 'user-inscription',
      label: $localize`Inscription et paiement`,
      audience: 'USER',
      url: '/tutos/03_Aide_utilisateur_Inscription_et_paiement.pdf',
    },
    {
      key: 'user-seances',
      label: $localize`Séances, présences et essais`,
      audience: 'USER',
      url: '/tutos/04_Aide_utilisateur_Seances_et_essais.pdf',
    },

    // Professeur
    {
      key: 'prof-adherents',
      label: $localize`Gérer les adhérents`,
      audience: 'PROF',
      url: '/tutos/01_Aide_prof_Adherents.pdf',
    },
    {
      key: 'prof-groupes',
      label: $localize`Gérer les groupes`,
      audience: 'PROF',
      url: '/tutos/02_Aide_prof_Groupes.pdf',
    },
    {
      key: 'prof-cours-seances',
      label: $localize`Cours et séances`,
      audience: 'PROF',
      url: '/tutos/03_Aide_prof_Cours_et_seances.pdf',
    },
    {
      key: 'prof-piloter-seance',
      label: $localize`Piloter une séance`,
      audience: 'PROF',
      url: '/tutos/04_Aide_prof_Piloter_une_seance.pdf',
    },

    // Administrateur
    {
      key: 'admin-centre-pilotage',
      label: $localize`Centre de pilotage`,
      audience: 'ADMIN',
      url: '/tutos/01_Aide_admin_Centre_de_pilotage.pdf',
    },
    {
      key: 'admin-saisons',
      label: $localize`Gérer les saisons`,
      audience: 'ADMIN',
      url: '/tutos/02_Aide_admin_Saisons.pdf',
    },
    {
      key: 'admin-tarifs',
      label: $localize`Tarifs d’inscription`,
      audience: 'ADMIN',
      url: '/tutos/03_Aide_admin_Tarifs_inscription.pdf',
    },
    {
      key: 'admin-codes-promo',
      label: $localize`Codes promotionnels`,
      audience: 'ADMIN',
      url: '/tutos/04_Aide_admin_Codes_promotionnels.pdf',
    },
    {
      key: 'admin-exigences',
      label: $localize`Exigences des dossiers`,
      audience: 'ADMIN',
      url: '/tutos/05_Aide_admin_Exigences_dossiers.pdf',
    },
    {
      key: 'admin-professeurs-contrats',
      label: $localize`Professeurs et contrats`,
      audience: 'ADMIN',
      url: '/tutos/06_Aide_admin_Professeurs_et_contrats.pdf',
    },
    {
      key: 'admin-lieux',
      label: $localize`Gérer les lieux`,
      audience: 'ADMIN',
      url: '/tutos/07_Aide_admin_Lieux.pdf',
    },
    {
      key: 'admin-finances',
      label: $localize`Gérer les finances`,
      audience: 'ADMIN',
      url: '/tutos/08_Aide_admin_Finances.pdf',
    },
    {
      key: 'admin-communication',
      label: $localize`Communication`,
      audience: 'ADMIN',
      url: '/tutos/09_Aide_admin_Communication.pdf',
    },
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

    erroservice.changeEmitted$.subscribe((data) => {
      this.DisplayError(data);
    });
  }

  get visibleHelpTopics(): HelpTopic[] {
    if (this.store.isAdmin()) {
      return this.helpTopics.filter((topic) => topic.audience === 'ADMIN');
    }

    if (this.store.isProf()) {
      return this.helpTopics.filter(
        (topic) => topic.audience === 'USER' || topic.audience === 'PROF',
      );
    }

    return this.helpTopics.filter((topic) => topic.audience === 'USER');
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
        this.helpOpen = false;
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private isPublicUrl(url: string): boolean {
    const hasPublicSuffix = /(^|\/)[^?#]*-public(\/|$|\?)/.test(url);
    const inPublicSegment = /(^|\/)public(\/|$|\?)/.test(url);
    const embedParam = url.includes('embed=1');

    return hasPublicSuffix || inPublicSegment || embedParam;
  }

  isact(): void {
    this.isactive = !this.isactive;
  }

  closeMenu(): void {
    this.isactive = false;
  }

  selectMenu(menu: MenuType): void {
    this.store.updateSelectedMenu(menu);
    this.closeMenu();
  }

  toggleHelp(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.helpOpen = !this.helpOpen;
  }

  openHelpTopic(_topic: HelpTopic, event?: Event): void {
    // Laisser le lien <a target="_blank"> faire l'ouverture nativement.
    // Safari iOS peut bloquer window.open() quand il est déclenché après un
    // preventDefault ; le comportement natif est fiable et garde le nouvel onglet.
    event?.stopPropagation();
    this.helpOpen = false;
  }

  @HostListener('document:click')
  closeHelp(): void {
    this.helpOpen = false;
  }

  @HostListener('document:keydown.escape')
  closeHelpOnEscape(): void {
    this.helpOpen = false;
  }

  LogOut(): void {
    const errorService = ErrorService.instance;

    this.action = $localize`Se déconnecter`;
    this.store.clearSession();
    this.router.navigate(['/login']);

    const notification = errorService.OKMessage(this.action);
    errorService.emitChange(notification);
  }

  Dashboard(): void {
    this.action = $localize`Afficher le tableau de bord`;
    this.router.navigate(['tdb']);
    this.closeMenu();
  }

  DisplayError(val: any): void {
    this.child.display_notification(val);
  }
}

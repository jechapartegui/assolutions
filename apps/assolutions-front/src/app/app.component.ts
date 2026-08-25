import { Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { StaticClass } from './global';
import { NotifJechaComponent } from './custom-notification/custom-notification.component';
import { environment } from '../environments/environment.prod';
import { ErrorService } from '../services/error.service';
import { NavigationEnd, Router } from '@angular/router';
import { AppStore } from './app.store';
import { distinctUntilChanged, filter, map, startWith, Subscription } from 'rxjs';
import { MenuType } from '../store/session.store';

type HelpTopic = {
  key: string;
  label: string;
  staffOnly?: boolean;
  url?: string | null;
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
    { key: 'mon-compte', label: $localize`Gérer mon compte` },
    { key: 'presences', label: $localize`Gérer mes présences` },
    { key: 'inscriptions', label: $localize`Gérer mes inscriptions` },
    { key: 'adherents', label: $localize`Gérer les adhérents`, staffOnly: true },
    { key: 'seances-cours', label: $localize`Gérer mes séances / cours`, staffOnly: true },
    { key: 'groupes', label: $localize`Gérer mes groupes`, staffOnly: true },
    { key: 'deroulement-seance', label: $localize`Déroulement d’une séance`, staffOnly: true },
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
    const canSeeStaffHelp = this.store.isProf() || this.store.isAdmin();
    return this.helpTopics.filter((topic) => !topic.staffOnly || canSeeStaffHelp);
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

  openHelpTopic(topic: HelpTopic, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.helpOpen = false;

    // Les PDF seront branchés ici : il suffira de renseigner l'URL du sujet.
    if (topic.url) {
      window.open(topic.url, '_blank', 'noopener,noreferrer');
    }
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

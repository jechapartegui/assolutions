import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { StaticClass } from './global';
import { NotifJechaComponent } from './custom-notification/custom-notification.component';
import { environment } from '../environments/environment.prod';
import { ErrorService } from '../services/error.service';
import { NavigationEnd, Router } from '@angular/router';
import { AppStore } from './app.store';
import { distinctUntilChanged, filter, map, startWith, Subscription } from 'rxjs';
import { MenuType } from '../store/session.store';

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
  g: StaticClass;
  search_text = '';
  envt = environment;
  isPublic = false;
  defaultProjectLabel = $localize`Projet`;

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

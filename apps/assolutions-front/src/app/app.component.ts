import { Component,  OnDestroy,  OnInit,  ViewChild } from '@angular/core';
import { StaticClass } from './global';
import { NotifJechaComponent } from './custom-notification/custom-notification.component';
import { environment } from '../environments/environment.prod';
import { CompteService } from '../services/compte.service';
import { ErrorService } from '../services/error.service';
import { GlobalService } from '../services/global.services';
import { NavigationEnd, Router } from '@angular/router';
import { AppStore } from './app.store';
import { distinctUntilChanged, filter, map, startWith, Subscription } from 'rxjs';

@Component({
  standalone: false,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'AsSolutions';
  action: string;
  isactive: boolean = false;
  g: StaticClass;
  search_text:string = "";
  envt = environment;
  @ViewChild(NotifJechaComponent, { static: true }) child: NotifJechaComponent;

  isPublic = false;
  private sub?: Subscription;


  private isPublicUrl(url: string): boolean {
    // ✅ match “/liste-seances-public”, “/liste-cours-public”, “/public/...”
    const hasPublicSuffix = /(^|\/)[^?#]*-public(\/|$|\?)/.test(url);
    const inPublicSegment = /(^|\/)public(\/|$|\?)/.test(url);
    const embedParam      = url.includes('embed=1'); // optionnel
    return hasPublicSuffix || inPublicSegment || embedParam;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
  constructor(public GlobalService:GlobalService,
    public erroservice: ErrorService,
    public compte_serv:CompteService,
    public globals: StaticClass,
    public router:Router,
    public store:AppStore
  ) {
    this.g = globals;
    erroservice.changeEmitted$.subscribe((data) => {
      this.DisplayError(data);
    })
  }
  public selected_menu: "MATCH" | "CLUB" | "COMPETITION"= "MATCH";
  ngOnInit(): void {
    this.sub = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects.toLowerCase()),
      startWith(this.router.url.toLowerCase()),
      distinctUntilChanged()
    ).subscribe(url => {
      this.isPublic = this.isPublicUrl(url);
    });
  }

  isact() {
    if (this.isactive) {
      this.isactive = false;
    } else {
      this.isactive = true;
    }
  }

  LogOut() {
    const errorService = ErrorService.instance;
    this.action = $localize`Se déconnecter`;
    this.store.logout();
    this.router.navigate(['/login']);
              let o = errorService.OKMessage(this.action);
              errorService.emitChange(o);
  }

  MDP() {
    this.action = $localize`Modifier le mot de passe`;
    this.router.navigate(['reinit-mdp']);
  }
  Dashboard() {
    this.action = $localize`Afficher le tableau de bord`;
    this.router.navigate(['tdb']);
  }

  DisplayError(val) {
    this.child.display_notification(val);
  }
  
}

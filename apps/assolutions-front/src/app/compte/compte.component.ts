import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CompteService } from '../../services/compte.service';
import { ErrorService } from '../../services/error.service';
import { Compte_VM } from '@shared/lib/compte.interface';
import { AppStore } from '../app.store';

@Component({
  standalone: false,
  selector: 'app-compte',
  templateUrl: './compte.component.html',
  styleUrls: ['./compte.component.css']
})
export class CompteComponent implements OnInit {

  baseUrl:string;

  public filters:FilterCompte = new FilterCompte();
    @ViewChild('scrollableContent', { static: false })
    scrollableContent!: ElementRef;
    showScrollToTop: boolean = false;

  sort_login: string;
  sort_actif: string;
  thisCompte: Compte_VM;

  ListeCompte: Compte_VM[];
  action: string;
  context: "LISTE" | "ECRITURE" = "LISTE";
  afficher_filtre: boolean = false;
  selected_filter:string;

    // Récupère l'URL actuelle sans les chemins et paramètres supplémentaires
  constructor(private cpteserv: CompteService, private router: Router, public store :AppStore) {
    
    this.baseUrl = `${window.location.protocol}//${window.location.hostname}`;
   }
  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les comptes`;

    if (this.store.isLoggedIn) {

      if ((this.store.mode() === "APPLI")) {
        this.router.navigate(['/menu']);
        return;
      }

      this.cpteserv.GetAll().then((cpt) => {
        this.ListeCompte = cpt;
      }).catch((error: HttpErrorResponse) => {
        let n = errorService.CreateError("Chargement", error);
        errorService.emitChange(n);
      });
    } else {

      this.router.navigate(['/login']);
      return;
    }
  }

  // IsAdminProf(pro_cp: projet_compte[], droit): boolean {
  //   if (pro_cp.find(x => x.droit == droit)) {
  //     return true;
  //   } else {
  //     return false;
  //   }
  // }

  // getToken(pro_cp: compte, droit: number) {
  //   if (pro_cp.projet_compte.find(x => x.droit == droit)) {
  //     let token = pro_cp.projet_compte.find(x => x.droit == droit).connexion_token;
  //     let url = this.baseUrl + "/login?username=" + pro_cp.login + "&token_connexion=" + token + "&droit=" + droit.toString();
  //     navigator.clipboard.writeText(url).then(() => {
  //       alert($localize`Texte copié dans le presse-papier !`);
  //     }).catch(err => {
  //       alert($localize`Échec de la copie du texte : ` + err);
  //     });
  //   }
  //   return;

  // }

  


  Sort(arg0: string, arg1: string) {
    throw new Error('Method not implemented.');
  }
  Creer() {
    throw new Error('Method not implemented.');
  }
  ExporterExcel() {
    throw new Error('Method not implemented.');
  }
  ReinitFiltre() {
    throw new Error('Method not implemented.');
  }
  IsEmail(text): boolean {
    var re = /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;
    return re.test(text);
  }
  Edit(cpt: Compte_VM) {
    throw new Error('Method not implemented.');
  }
  Delete(_t115: any) {
    throw new Error('Method not implemented.');
  }
  Save() {
    throw new Error('Method not implemented.');
  }
  Retour(arg0: string) {
    throw new Error('Method not implemented.');
  }

  ngAfterViewInit(): void {
    this.waitForScrollableContainer();
  }

  private waitForScrollableContainer(): void {
    setTimeout(() => {
      if (this.scrollableContent) {
        this.scrollableContent.nativeElement.addEventListener(
          'scroll',
          this.onContentScroll.bind(this)
        );
      } else {
        this.waitForScrollableContainer(); // Re-tente de le trouver
      }
    }, 100); // Réessaie toutes les 100 ms
  }

  onContentScroll(): void {
    const scrollTop = this.scrollableContent.nativeElement.scrollTop || 0;
    this.showScrollToTop = scrollTop > 200;
  }

  scrollToTop(): void {
    this.scrollableContent.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth', // Défilement fluide
    });
  }
}

export class FilterCompte {
  private _filter_email: string | null = null;
  get filter_email(): string | null {
    return this._filter_email;
  }
  set filter_email(value: string | null) {
    this._filter_email = value;
    this.onFilterChange();
  }

  private _filter_droit: string | null = null;
  get filter_droit(): string | null {
    return this._filter_droit;
  }
  set filter_droit(value: string | null) {
    this._filter_droit = value;
    this.onFilterChange();
  }

  private _filter_adherent: string | null = null;
  get filter_adherent(): string | null {
    return this._filter_adherent;
  }
  set filter_adherent(value: string | null) {
    this._filter_adherent = value;
    this.onFilterChange();
  }

  private onFilterChange(): void {}
}

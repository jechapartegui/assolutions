import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, firstValueFrom, timeout } from 'rxjs';
import { DatePipe } from '@angular/common';
import { environment } from '../environments/environment.prod';
import { compte, ProjetLogin, ProjetView } from '@shared/compte/src/lib/compte.interface';
import { generatePassword } from '../class/password';
import { KeyValuePair } from '@shared/compte/src/lib/autres.interface';
import { ReglesFormulaire } from '../class/regles';
import { REGLES_PAR_DEFAUT } from '../assets/regles.const';

@Injectable({
  providedIn: 'root'
})
export class GlobalService {
  static instance: GlobalService;
  private isSelectedMenu = new BehaviorSubject<"ADHERENT" | "COURS" | "SEANCE" | "GROUPE" | "SAISON" | "LIEU" | "MENU" | "COMPTE"| "PROF"| "STOCK"| "SUIVIMAIL"| "PROJETINFO"| "PROJETMAIL"| "COMPTA"| "STOCK"| "CB" | "FACTURE"| "ENVOIMAIL" | "ADMINISTRATEUR"| "TDB"| "TRANSACTION" | "LISTE_VALEUR">("MENU");
  static selected_menu: "ADHERENT" | "COURS" | "SEANCE" | "GROUPE" | "SAISON" | "LIEU" | "MENU"| "COMPTE"| "PROF"| "STOCK"| "SUIVIMAIL"| "PROJETINFO"| "PROJETMAIL"| "COMPTA"| "STOCK"| "CB" | "FACTURE"| "ENVOIMAIL" | "ADMINISTRATEUR"| "TDB"| "TRANSACTION" | "LISTE_VALEUR"= "MENU";

  SelectedMenu$: Observable<"ADHERENT" | "COURS" | "SEANCE" | "GROUPE" | "SAISON" | "LIEU" | "MENU"| "COMPTE"| "PROF"| "STOCK"| "SUIVIMAIL"| "PROJETINFO"| "PROJETMAIL"| "COMPTA"| "STOCK"| "CB" | "FACTURE"| "ENVOIMAIL" | "ADMINISTRATEUR"| "TDB"| "TRANSACTION"| "LISTE_VALEUR"> = this.isSelectedMenu.asObservable();


  private isCompte = new BehaviorSubject<compte>(null);
  static compte: compte = null;
  Compte$: Observable<compte> = this.isCompte.asObservable();

   private regles: ReglesFormulaire = REGLES_PAR_DEFAUT;

  getRegles(): ReglesFormulaire {
    return this.regles;
  }

  // plus tard : méthode pour charger depuis JSON
  setRegles(regles: ReglesFormulaire): void {
    this.regles = regles;
  }


  private isMenu = new BehaviorSubject<"APPLI" | "ADMIN">(null);
  static menu: "APPLI" | "ADMIN" = null;
  Menu$: Observable<"APPLI" | "ADMIN"> = this.isMenu.asObservable();

  private isLoggedIn = new BehaviorSubject<boolean>(false);
  static is_logged_in: boolean = false;
  isLoggedIn$: Observable<boolean> = this.isLoggedIn.asObservable();

  private isSaisonActive = new BehaviorSubject<number>(null);
  public static saison_active: number = null;
  isSaisonActive$: Observable<number> = this.isSaisonActive.asObservable();

  private isGestionnaire = new BehaviorSubject<boolean>(false);
  static is_gestionnaire: boolean = false;
  isGestionnaire$: Observable<boolean> = this.isGestionnaire.asObservable();

  private isProjet = new BehaviorSubject<ProjetView>(null);
  static projet: ProjetView = null;
  Projet$: Observable<ProjetView> = this.isProjet.asObservable();

  private isProjetAdmin = new BehaviorSubject<ProjetLogin>(null);
  static projetAdmin: ProjetLogin = null;
  ProjetAdmin$: Observable<ProjetLogin> = this.isProjetAdmin.asObservable();

  private isOtherProject = new BehaviorSubject<ProjetView[]>(null);
  static other_project: ProjetView[] = null;
  OtherProject$: Observable<ProjetView[]> = this.isOtherProject.asObservable();

  thisLanguage: "FR" | "EN";
  constructor(private http: HttpClient, private datepipe: DatePipe) {
    GlobalService.instance = this;
  }
  updateTypeApplication(men: "APPLI" | "ADMIN"): void {
    this.isMenu.next(men);
    GlobalService.menu = men;
  }
  updateSelectedMenuStatus(selected: "ADHERENT" | "COURS" | "SEANCE" | "GROUPE" | "SAISON" | "LIEU" | "MENU"| "COMPTE"| "PROF"| "STOCK"| "SUIVIMAIL"| "PROJETINFO"| "PROJETMAIL"| "COMPTA"| "STOCK"| "CB" | "FACTURE"| "ENVOIMAIL"| "ADMINISTRATEUR"| "TDB"| "TRANSACTION"| "LISTE_VALEUR"): void {
    this.isSelectedMenu.next(selected);
    GlobalService.selected_menu = selected;
  }
  updateCompte(_c: compte): void {
    this.isCompte.next(_c);
    GlobalService.compte = _c;
    this.isLoggedIn.next(true);
    GlobalService.is_logged_in = true;
  }
  updateLoggedin(b: boolean): void {
    this.isLoggedIn.next(b);
    GlobalService.is_logged_in = b;
  }
  updateProjet(_p: ProjetView): void {
    this.isProjet.next(_p);
    GlobalService.projet = _p;
  }
  updateListeProjet(_p: ProjetView[]): void {
    this.isOtherProject.next(_p);
    GlobalService.other_project = _p;
  }

  updateGestionnaire(_p: ProjetView): void {
    this.isGestionnaire.next(_p.gestionnaire);
    GlobalService.is_gestionnaire = _p.gestionnaire;
  }

  updateProjetAdmin(_p: ProjetLogin): void {
    this.isProjetAdmin.next(_p);
    GlobalService.projetAdmin = _p;
  }
    updateSaisonActive(b: number): void {
    this.isSaisonActive.next(b);
    GlobalService.saison_active = b;
  }

  public ListeSeanceProf: KeyValuePair[] = [
    { key: 0, value: $localize`Prévue` },
    { key: 1, value: $localize`Réalisée` },
    { key: 2, value: $localize`Annulée` }
    // Ajoutez d'autres paires key-value selon vos besoins
  ];

  public async GET(url: string): Promise<any> {

    try {
      let date_ref = new Date();
      let date_ref_string = this.datepipe.transform(date_ref, "yyyy-MM-dd")
      let _varid: string = "0";
      let project_id: string = "-1";
      const timeoutMilliseconds = 50000;
      if (GlobalService.compte) {
        _varid = GlobalService.compte.id.toString();
      }
      if (GlobalService.projet) {
        project_id = GlobalService.projet.id.toString();
      }

      const expectedPassword = generatePassword(_varid, project_id, date_ref_string);
      const headers = new HttpHeaders()
        .set('content-type', 'application/json')
        .set('Access-Control-Allow-Origin', '*')
        .set('password', expectedPassword)
        .set('dateref', date_ref_string)
        .set('projectid', project_id)
        .set('lang', this.getCurrentLanguage())
        .set('userid', _varid)
      const response = await firstValueFrom(this.http.get(url, { headers }).pipe(
        timeout(timeoutMilliseconds),
          catchError((error) => {
            if (error.name === 'TimeoutError') {
              throw new Error('La requête a expiré en raison du délai dépassé.');
            } else {
              throw error; // Gérer d'autres erreurs ici
            }
          })
        )
      );
      return response;
    } catch (error) {
      console.log(error);
      if (error instanceof HttpErrorResponse) {
        this.handleError(error);
      } else {
        throw new Error('Une erreur inattendue s\'est produite. Veuillez réessayer plus tard.');
      }
    }
  }

  public async POST(url: string, body: any): Promise<any> {
    try {
      let date_ref = new Date();
      let date_ref_string = this.datepipe.transform(date_ref, "yyyy-MM-dd")
      let _varid: string = "0";
      let project_id: string = "-1";
      const timeoutMilliseconds = 50000;
      if (GlobalService.compte) {
        _varid = GlobalService.compte.id.toString();
      }
      if (GlobalService.projet) {
        project_id = GlobalService.projet.id.toString();
      }

      const password = _varid + date_ref_string; // Remplacez par le mot de passe à hacher
      const hashedPassword = CryptoJS.HmacSHA256(password, environment.password).toString(CryptoJS.enc.Hex);

      const headers = new HttpHeaders()
        .set('content-type', 'application/json')
        .set('Access-Control-Allow-Origin', '*')
        .set('password', hashedPassword)
        .set('dateref', date_ref_string)
        .set('projectid', project_id)
        .set('lang', this.getCurrentLanguage())
        .set('userid', _varid)
      const response = await firstValueFrom(
        this.http.post(url, body, { headers }).pipe(
          timeout(timeoutMilliseconds),
          catchError((error) => {
            if (error.name === 'TimeoutError') {
              throw new Error('La requête a expiré en raison du délai dépassé.');
            } else {
              throw error; // Gérer d'autres erreurs ici
            }
          })
        )
      );
      return response;
    } catch (error) {
      console.log(error);
      if (error instanceof HttpErrorResponse) {
        this.handleError(error);
      } else {
        throw new Error('Une erreur inattendue s\'est produite. Veuillez réessayer plus tard.');
      }
    }
  }
  public async PUT(url: string, body: any): Promise<any> {
  try {
    let date_ref = new Date();
      let date_ref_string = this.datepipe.transform(date_ref, "yyyy-MM-dd")
      let _varid: string = "0";
      let project_id: string = "-1";
      const timeoutMilliseconds = 50000;
      if (GlobalService.compte) {
        _varid = GlobalService.compte.id.toString();
      }
      if (GlobalService.projet) {
        project_id = GlobalService.projet.id.toString();
      }

      const expectedPassword = generatePassword(_varid, project_id, date_ref_string);
      const headers = new HttpHeaders()
        .set('content-type', 'application/json')
        .set('Access-Control-Allow-Origin', '*')
        .set('password', expectedPassword)
        .set('dateref', date_ref_string)
        .set('projectid', project_id)
        .set('lang', this.getCurrentLanguage())
        .set('userid', _varid)

    const response = await firstValueFrom(
      this.http.put(url, body, { headers }).pipe(
        timeout(timeoutMilliseconds),
        catchError((error) => {
          if (error.name === 'TimeoutError') {
            throw new Error('La requête a expiré en raison du délai dépassé.');
          } else {
            throw error;
          }
        })
      )
    );

    return response;
  } catch (error) {
    console.log(error);
    if (error instanceof HttpErrorResponse) {
      this.handleError(error);
    } else {
      throw new Error('Une erreur inattendue s\'est produite. Veuillez réessayer plus tard.');
    }
  }
}
public async DELETE(url: string): Promise<any> {
  try {
    let date_ref = new Date();
      let date_ref_string = this.datepipe.transform(date_ref, "yyyy-MM-dd")
      let _varid: string = "0";
      let project_id: string = "-1";
      const timeoutMilliseconds = 50000;
      if (GlobalService.compte) {
        _varid = GlobalService.compte.id.toString();
      }
      if (GlobalService.projet) {
        project_id = GlobalService.projet.id.toString();
      }

      const expectedPassword = generatePassword(_varid, project_id, date_ref_string);
      const headers = new HttpHeaders()
        .set('content-type', 'application/json')
        .set('Access-Control-Allow-Origin', '*')
        .set('password', expectedPassword)
        .set('dateref', date_ref_string)
        .set('projectid', project_id)
        .set('lang', this.getCurrentLanguage())
        .set('userid', _varid)
    const response = await firstValueFrom(
      this.http.delete(url, { headers }).pipe(
        timeout(timeoutMilliseconds),
        catchError((error) => {
          if (error.name === 'TimeoutError') {
            throw new Error('La requête a expiré en raison du délai dépassé.');
          } else {
            throw error;
          }
        })
      )
    );

    return response;
  } catch (error) {
    console.log(error);
    if (error instanceof HttpErrorResponse) {
      this.handleError(error);
    } else {
      throw new Error('Une erreur inattendue s\'est produite. Veuillez réessayer plus tard.');
    }
  }
}

  private handleError(error: HttpErrorResponse): void {
    console.log(error);
    let message: string;
    message = error.error.message;
    
    throw new Error(message);
  }
  public getCurrentLanguage(): string {
    if (navigator.languages && navigator.languages.length) {
      if (navigator.languages[0].toLowerCase().includes("EN")) {
        return "EN";
      }
      if (navigator.languages[0].toLowerCase().includes("US")) {
        return "EN";
      } else {
        return "FR";
      }
    } else {
      return "FR";
    }
  }
  public getBoolean(value) : boolean{
   switch(value){
        case true:
        case "true":
        case 1:
        case "1":
        case "on":
        case "yes":
            return true;
        default: 
            return false;
    }
}

}


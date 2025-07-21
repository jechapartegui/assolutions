import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, firstValueFrom, timeout } from 'rxjs';
import { DatePipe } from '@angular/common';
import { Compte_VM, ProjetLogin, ProjetView } from '@shared/src/lib/compte.interface';
import { generatePassword } from '../class/password';
import { KeyValuePair, ValidationItem } from '@shared/src/lib/autres.interface';
import { ReglesFormulaire } from '../class/regles';
import { REGLES_PAR_DEFAUT } from '../assets/regles.const';
import { ItemContact } from '@shared/src/lib/personne.interface';

@Injectable({
  providedIn: 'root'
})
export class GlobalService {
  static instance: GlobalService;
  private isSelectedMenu = new BehaviorSubject<"ADHERENT" | "COURS" | "SEANCE" | "GROUPE" | "SAISON" | "LIEU" | "MENU" | "COMPTE"| "PROF"| "STOCK"| "SUIVIMAIL"| "PROJETINFO"| "PROJETMAIL"| "COMPTA"| "STOCK"| "CB" | "FACTURE"| "ENVOIMAIL" | "ADMINISTRATEUR"| "TDB"| "TRANSACTION" | "LISTE_VALEUR">("MENU");
  static selected_menu: "ADHERENT" | "COURS" | "SEANCE" | "GROUPE" | "SAISON" | "LIEU" | "MENU"| "COMPTE"| "PROF"| "STOCK"| "SUIVIMAIL"| "PROJETINFO"| "PROJETMAIL"| "COMPTA"| "STOCK"| "CB" | "FACTURE"| "ENVOIMAIL" | "ADMINISTRATEUR"| "TDB"| "TRANSACTION" | "LISTE_VALEUR"= "MENU";

  SelectedMenu$: Observable<"ADHERENT" | "COURS" | "SEANCE" | "GROUPE" | "SAISON" | "LIEU" | "MENU"| "COMPTE"| "PROF"| "STOCK"| "SUIVIMAIL"| "PROJETINFO"| "PROJETMAIL"| "COMPTA"| "STOCK"| "CB" | "FACTURE"| "ENVOIMAIL" | "ADMINISTRATEUR"| "TDB"| "TRANSACTION"| "LISTE_VALEUR"> = this.isSelectedMenu.asObservable();


  private isCompte = new BehaviorSubject<Compte_VM>(null);
  static compte: Compte_VM = null;
  Compte$: Observable<Compte_VM> = this.isCompte.asObservable();

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
  public saison_active: number = null;
  isSaisonActive$: Observable<number> = this.isSaisonActive.asObservable();


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
  updateCompte(_c: Compte_VM): void {
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

  updateProjetAdmin(_p: ProjetLogin): void {
    this.isProjetAdmin.next(_p);
    GlobalService.projetAdmin = _p;
  }
   

  public ListeSeanceProf: KeyValuePair[] = [
    { key: 0, value: $localize`Prévue` },
    { key: 1, value: $localize`Réalisée` },
    { key: 2, value: $localize`Annulée` }
    // Ajoutez d'autres paires key-value selon vos besoins
  ];

public async GET(url: string): Promise<any>;
public async GET(url: string, responseType: 'json'): Promise<any>;
public async GET(url: string, responseType: 'text'): Promise<string>;
public async GET(url: string, responseType: 'json' | 'text' = 'json'): Promise<any> {
  try {
    let date_ref = new Date();
    let date_ref_string = this.datepipe.transform(date_ref, "yyyy-MM-dd");
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
      .set('userid', _varid);

    const options: any = {
      headers,
      responseType: responseType === 'text' ? 'text' : 'json',
    };

    const response = await firstValueFrom(
      this.http.get(url, options).pipe(
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

public validerChaine(
  valeur: string,
  min: number,
  max: number,
  obligatoire: boolean,
  label: string
): ValidationItem {
  if (obligatoire && !valeur?.trim()) {
    return { key:false, value:`${label} obligatoire` };
  }
  if (min > -1 && valeur?.length < min) {
     return { key:false, value:`${label} trop court` };
  }
  if (max > -1 && valeur?.length > max) {
     return { key:false, value:`${label} trop long` };
  }
  return { key:true,value:null};
}
public validerNombre(
  valeur: number  | null,
  min: number,
  max: number,
  obligatoire: boolean,
  label: string
): ValidationItem {
  if (obligatoire && !valeur) {
    return { key:false, value:`${label} obligatoire` };
  }
  if (min > -1 && valeur < min) {
     return { key:false, value:`${label} trop court` };
  }
  if (max > -1 && valeur > max) {
     return { key:false, value:`${label} trop long` };
  }
  return { key:true,value:null};
}

public validerSaisie(
  valeur: number | string | null, obligatoire: boolean, label: string
): ValidationItem {
  if (obligatoire && !valeur) {
    return { key:false, value:`${label} obligatoire` };
  }
  if (valeur === null || valeur === undefined || valeur === '') {
    return { key:false, value:`${label} obligatoire` };
  }
  return { key:true,value:null};
}

public validerDate(
  valeur: Date | null,
  min: Date | null,
  max: Date | null,
  obligatoire: boolean,
  label: string
): ValidationItem {
  if (obligatoire && !valeur) {
    return { key:false, value:`${label} obligatoire` };
  }

  if (valeur) {
    if (min && valeur < min) {
     return { key:false, value:`${label} trop ancienne (min : ${min.toLocaleDateString()})` };
    }

    if (max && valeur > max) {
    return { key:false, value:`${label} trop récente (max : ${max.toLocaleDateString()})` };
    }
  }

  return { key:true,value:null};
}
public validerHeure(
  valeur: string | null,
  min: string | null,
  max: string | null,
  obligatoire: boolean,
  label: string
): ValidationItem {
  if (obligatoire && !valeur) {
    return { key: false, value: `${label} obligatoire` };
  }

  if (valeur) {
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const valeurMinutes = toMinutes(valeur);

    if (min && valeurMinutes < toMinutes(min)) {
      return {
        key: false,
        value: `${label} trop tôt (min : ${min})`
      };
    }

    if (max && valeurMinutes > toMinutes(max)) {
      return {
        key: false,
        value: `${label} trop tard (max : ${max})`
      };
    }
  }

  return { key: true, value: null };
}

validerContact(contact:ItemContact) : ValidationItem {
if(contact.Type== 'EMAIL'){
  if(!this.checkIfEmailInString(contact.Value)){
    return { key:false, value:`${contact.Type} ${contact.Value} non valide` };
  } else {
    return { key:true,value:null};
  }
} else if(contact.Type== 'PHONE'){
  if(!this.checkIfTelInstring(contact.Value)){
    return { key:false, value:`${contact.Type} ${contact.Value} non valide` };
  } else {
    return { key:true,value:null};
  }
}
return { key:true,value:null};
}

public checkIfEmailInString(text): boolean {
    var re = /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;
    return re.test(text);
  }
  public checkIfTelInstring(value: string): boolean {
      // Regular expression for international or national phone numbers with optional separators
      var re = /^(\+?[0-9]{1,3}[-\s\.]?)?(\(?[0-9]{1,4}\)?[-\s\.]?)?([0-9]{1,4}[-\s\.]?[0-9]{1,9})$/;
      return re.test(value);
    }

}


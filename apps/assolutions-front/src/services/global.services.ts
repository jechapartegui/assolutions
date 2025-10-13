import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import {  catchError, firstValueFrom, timeout } from 'rxjs';
import { DatePipe } from '@angular/common';
import { generatePassword } from '../class/password';
import { KeyValuePair, ValidationItem } from '@shared/lib/autres.interface';
import { ReglesAdresse, ReglesContact, ReglesFormulaire } from '../class/regles';
import { REGLES_PAR_DEFAUT } from '../assets/regles.const';
import { ItemContact } from '@shared/lib/personne.interface';
import { AppStore } from '../app/app.store';

@Injectable({
  providedIn: 'root'
})
export class GlobalService {
  static instance: GlobalService;
 

   private regles: ReglesFormulaire = REGLES_PAR_DEFAUT;

  getRegles(): ReglesFormulaire {
    return this.regles;
  }
  getRegleLieuAdresse(): ReglesAdresse {
    return {
    Street_min: -1,
    Street_max: -1,
    Street_obligatoire: true,
    PostCode_min: 4,
    PostCode_max: -1,
    PostCode_obligatoire: true,
    City_min: -1,
    City_max: -1,
    City_obligatoire: true,
    Adresse_obligatoire: true
    };
  }

   getRegleProjetAdresse(): ReglesAdresse {
    return {
    Street_min: -1,
    Street_max: -1,
    Street_obligatoire: true,
    PostCode_min: 4,
    PostCode_max: -1,
    PostCode_obligatoire: true,
    City_min: -1,
    City_max: -1,
    City_obligatoire: true,
    Adresse_obligatoire: true
    };
  }

  getRegleProjetContact(): ReglesContact {
    return {
     nb_contact_min: 2,
    nb_contact_max: 5,  
    verifier_format: true,
    mail_obligatoire: true,
    tel_obligatoire: true
    };
  }

  // plus tard : méthode pour charger depuis JSON
  setRegles(regles: ReglesFormulaire): void {
    this.regles = regles;
  }


 
  thisLanguage: "FR" | "EN";
  constructor(private http: HttpClient, private datepipe: DatePipe, public store:AppStore) {
    GlobalService.instance = this;
    
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
    const timeoutMilliseconds = 1500000;

    if (this.store.compte()) {
  _varid = this.store.compte()!.id.toString();
}

if (this.store.projet()) {
  project_id = this.store.projet()!.id.toString();
}

    const expectedPassword = generatePassword(_varid, project_id, date_ref_string);
    const headers = new HttpHeaders()
      .set('content-type', 'application/json')
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
      const timeoutMilliseconds = 1500000;
    if (this.store.compte()) {
  _varid = this.store.compte()!.id.toString();
}

if (this.store.projet()) {
  project_id = this.store.projet()!.id.toString();
}

      const expectedPassword = generatePassword(_varid, project_id, date_ref_string);
      const headers = new HttpHeaders()
        .set('content-type', 'application/json')
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
      const timeoutMilliseconds = 1500000;
     if (this.store.compte()) {
  _varid = this.store.compte()!.id.toString();
}

if (this.store.projet()) {
  project_id = this.store.projet()!.id.toString();
}

      const expectedPassword = generatePassword(_varid, project_id, date_ref_string);
      const headers = new HttpHeaders()
        .set('content-type', 'application/json')
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
  valeur: unknown,
  min: number,
  max: number,
  obligatoire: boolean,
  label: string
): ValidationItem {
  const s = (valeur ?? '').toString(); // normalise tout en string
  const v = s.trim();

  if (obligatoire && v.length === 0) {
    return { key: false, value: `${label} obligatoire` };
  }
  if (min > -1 && v.length < min) {
    return { key: false, value: `${label} trop court` };
  }
  if (max > -1 && v.length > max) {
    return { key: false, value: `${label} trop long` };
  }
  return { key: true, value: null };
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
  const formatDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  if (min && new Date(valeur) < new Date(min)) {
    return {
      key: false,
      value: `${label} trop ancienne (min : ${formatDate(new Date(min))})`
    };
  }

  if (max && new Date(valeur) > new Date(max)) {
    return {
      key: false,
      value: `${label} trop récente (max : ${formatDate(new Date(max))})`
    };
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


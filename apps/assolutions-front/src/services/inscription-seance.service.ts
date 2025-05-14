import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { inscription_seance } from '@shared/compte/src/lib/inscription_seance.interface';
import { full_inscription_seance } from '@shared/compte/src/lib/inscription_seance.interface';

@Injectable({
  providedIn: 'root'
})
export class InscriptionSeanceService {
  url = environment.maseance;
  constructor(public global: GlobalService) {
 }
 public Get(id:number): Promise<inscription_seance> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = 'api/inscription_seance/get/' + id;
  //  this.url = this.url + "login.php";

  return this.global.GET(this.url)
    .then((response: inscription_seance) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public GetFull(id:number): Promise<full_inscription_seance> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
 this.url = 'api/inscription_seance/get_full/' + id;
  //  this.url = this.url + "login.php";

  return this.global.GET(this.url)

    .then((response: full_inscription_seance) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
 public GetAllCours(cours_id:number): Promise<inscription_seance[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = 'api/inscription_seance/get_all_cours/' + cours_id;
  //  this.url = this.url + "login.php";

  return this.global.GET(this.url)
    .then((response: inscription_seance[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public GetAllRider(rider_id:number): Promise<inscription_seance[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = 'api/inscription_seance/get_all_rider/' + rider_id;
  //  this.url = this.url + "login.php";

  return this.global.GET(this.url)
    .then((response: inscription_seance[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public GetAllRiderSaison(rider_id:number, saison_id:number): Promise<inscription_seance[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
this.url = `api/inscription_seance/get_all_rider_saison/${rider_id}/${saison_id}`;

  //  this.url = this.url + "login.php";

  return this.global.GET(this.url)
    .then((response: inscription_seance[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public GetAllSeance(seance_id:number): Promise<any> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
 this.url = 'api/inscription_seance/get_all_seance/' + seance_id;
  //  this.url = this.url + "login.php";

  return this.global.GET(this.url)
    .then((response: any) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public Add(inscription:inscription_seance): Promise<number> {
  this.url = 'api/inscription_seance/add';

  return this.global.PUT(this.url, inscription)
    .then((response: number) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Update(inscription:inscription_seance): Promise<boolean> {
    this.url = 'api/inscription_seance/update';

  return this.global.PUT(this.url, inscription)
    .then((response: boolean) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Delete(id:number): Promise<boolean> {
 this.url = 'api/inscription_seance/delete/' + id;

  return this.global.DELETE(this.url)
    .then((response: boolean) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
}


import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { Adhesion } from '../class/adhesion';

@Injectable({
  providedIn: 'root'
})
export class InscriptionSaisonService {
  url = environment.maseance;
  constructor(public global: GlobalService) {
 }

 public GetAllByRider(rider_id:number): Promise<Adhesion[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/inscriptionsaison_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_all_rider",
    rider_id:rider_id
  };

  return this.global.POST(this.url, body)
    .then((response: Adhesion[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public GetAllBySaison(saison_id:number): Promise<Adhesion[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/inscriptionsaison_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_all_saison",
    saison_id:saison_id
  };

  return this.global.POST(this.url, body)
    .then((response: Adhesion[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}



public Add(saison_id:number, rider_id:number): Promise<number> {
  this.url = environment.maseance + 'maseance/inscriptionsaison_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"add",
    saison_id:saison_id,
    rider_id:rider_id
  };

  return this.global.POST(this.url, body)
    .then((response: number) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public Delete(id:number): Promise<boolean> {
  this.url = environment.maseance + 'maseance/inscriptionsaison_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"delete",
    id:id,
  };

  return this.global.POST(this.url, body)
    .then((response: boolean) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
}
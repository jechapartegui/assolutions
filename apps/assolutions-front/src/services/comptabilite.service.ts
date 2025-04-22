import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from 'src/environments/environment.prod';
import { fluxfinancier } from 'src/class/fluxfinancier';

@Injectable({
  providedIn: 'root'
})
export class ComptabiliteService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
 }
 public VoirSituation(saison_id:number): Promise<fluxfinancier[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/fluxfinancier_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"situation_complete",
    saison_id:saison_id
  };

  return this.global.POST(this.url, body)
    .then((response: fluxfinancier[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
 public Add(fluxfinancier:fluxfinancier): Promise<number> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/fluxfinancier_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"add",
    fluxfinancier:fluxfinancier
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



public Update(fluxfinancier:fluxfinancier): Promise<boolean> {
  this.url = environment.maseance + 'maseance/fluxfinancier_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"update",
    fluxfinancier:fluxfinancier,
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

public Delete(id:number): Promise<boolean> {
  this.url = environment.maseance + 'maseance/fluxfinancier_manage.php';
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

public Get(id:number): Promise<fluxfinancier> {
  this.url = environment.maseance + 'maseance/fluxfinancier_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get",
    id:id,
  };

  return this.global.POST(this.url, body)
    .then((response: fluxfinancier) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public GetAll(date_min:Date=null, date_max:Date=null): Promise<fluxfinancier[]> {
  this.url = environment.maseance + 'maseance/fluxfinancier_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_all",
    date_min:date_min,
    date_max:date_max
  };

  return this.global.POST(this.url, body)
    .then((response: fluxfinancier[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
}


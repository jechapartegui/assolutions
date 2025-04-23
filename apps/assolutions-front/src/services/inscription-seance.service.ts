import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { inscription_seance } from '../class/inscription';

@Injectable({
  providedIn: 'root'
})
export class InscriptionSeanceService {
  url = environment.maseance;
  constructor(public global: GlobalService) {
 }
 public Get(id:number): Promise<inscription_seance> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/inscriptionseance_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get",
    id:id
  };

  return this.global.POST(this.url, body)
    .then((response: inscription_seance) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
 public GetAllCours(cours_id:number): Promise<inscription_seance[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/inscriptionseance_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_all_cours",
    cours_id:cours_id
  };

  return this.global.POST(this.url, body)
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
  this.url = environment.maseance + 'maseance/inscriptionseance_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_all_rider",
    rider_id:rider_id
  };

  return this.global.POST(this.url, body)
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
  this.url = environment.maseance + 'maseance/inscriptionseance_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_all_rider",
    rider_id:rider_id,
    saison_id:saison_id
  };

  return this.global.POST(this.url, body)
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
  this.url = environment.maseance + 'maseance/inscriptionseance_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_all_seance",
    seance_id:seance_id
  };

  return this.global.POST(this.url, body)
    .then((response: any) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public Add(inscription:inscription_seance): Promise<number> {
  this.url = environment.maseance + 'maseance/inscriptionseance_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"add",
    inscription:inscription,
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
public Update(inscription:inscription_seance): Promise<boolean> {
  this.url = environment.maseance + 'maseance/inscriptionseance_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"update",
    inscription:inscription,
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
  this.url = environment.maseance + 'maseance/inscriptionseance_manage.php';
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


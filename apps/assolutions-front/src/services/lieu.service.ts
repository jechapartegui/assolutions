import { Injectable } from '@angular/core';
import { KeyValuePair } from '../class/keyvaluepair';
import { lieu } from '../class/lieu';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';

@Injectable({
  providedIn: 'root'
})
export class LieuService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
 }
 public Get(id:number): Promise<lieu> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/lieu_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get",
    id:id
  };

  return this.global.POST(this.url, body)
    .then((response: lieu) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
 public GetAll(): Promise<lieu[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/lieu_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_all"
  };

  return this.global.POST(this.url, body)
    .then((response: lieu[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public GetAllLight(): Promise<KeyValuePair[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/lieu_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_all_light"
  };

  return this.global.POST(this.url, body)
    .then((response: KeyValuePair[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public Add(lieu:lieu): Promise<number> {
  this.url = environment.maseance + 'maseance/lieu_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"add",
    lieu:lieu,
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
public Update(lieu:lieu): Promise<boolean> {
  this.url = environment.maseance + 'maseance/lieu_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"update",
    lieu:lieu,
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
  this.url = environment.maseance + 'maseance/lieu_manage.php';
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

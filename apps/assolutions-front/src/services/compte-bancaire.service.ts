import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from '../environments/environment.prod';
import { CompteBancaire } from '../class/comptebancaire';

@Injectable({
  providedIn: 'root'
})
export class CompteBancaireService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
 }
 public Get(id:number): Promise<CompteBancaire> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/comptebancaire_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get",
    id:id
  };

  return this.global.POST(this.url, body)
    .then((response: CompteBancaire) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
 public GetAll(): Promise<CompteBancaire[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/comptebancaire_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_all"
  };

  return this.global.POST(this.url, body)
    .then((response: CompteBancaire[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}


public Add(cb:CompteBancaire): Promise<number> {
  this.url = environment.maseance + 'maseance/comptebancaire_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"add",
    cb:cb,
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
public Update(cb:CompteBancaire): Promise<boolean> {
  this.url = environment.maseance + 'maseance/comptebancaire_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"update",
    cb:cb,
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
  this.url = environment.maseance + 'maseance/comptebancaire_manage.php';
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


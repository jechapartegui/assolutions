import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from 'src/environments/environment.prod';
import { operation } from 'src/class/operation';

@Injectable({
  providedIn: 'root'
})
export class operationService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
 }

 public Add(operation:operation): Promise<number> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/operation_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"add",
    operation:operation
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



public Update(operation:operation): Promise<boolean> {
  this.url = environment.maseance + 'maseance/operation_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"update",
    operation:operation,
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
  this.url = environment.maseance + 'maseance/operation_manage.php';
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

public Get(id:number): Promise<operation> {
  this.url = environment.maseance + 'maseance/operation_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get",
    id:id,
  };

  return this.global.POST(this.url, body)
    .then((response: operation) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public GetByFF(id:number): Promise<operation[]> {
  this.url = environment.maseance + 'maseance/operation_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_all_by_fluxfinancier",
    id:id
  };

  return this.global.POST(this.url, body)
    .then((response: operation[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public GetAll(date_min:Date=null, date_max:Date=null): Promise<operation[]> {
  this.url = environment.maseance + 'maseance/operation_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_all",
    date_min:date_min,
    date_max:date_max
  };

  return this.global.POST(this.url, body)
    .then((response: operation[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
}


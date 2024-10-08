import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from 'src/environments/environment.prod';
import { transaction } from 'src/class/transaction';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
 }

 public Add(transaction:transaction): Promise<number> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/transaction_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"add",
    transaction:transaction
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



public Update(transaction:transaction): Promise<boolean> {
  this.url = environment.maseance + 'maseance/transaction_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"update",
    transaction:transaction,
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
  this.url = environment.maseance + 'maseance/transaction_manage.php';
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

public Get(id:number): Promise<transaction> {
  this.url = environment.maseance + 'maseance/transaction_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get",
    id:id,
  };

  return this.global.POST(this.url, body)
    .then((response: transaction) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public GetAll(date_min:Date=null, date_max:Date=null): Promise<transaction[]> {
  this.url = environment.maseance + 'maseance/transaction_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_all",
    date_min:date_min,
    date_max:date_max
  };

  return this.global.POST(this.url, body)
    .then((response: transaction[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
}


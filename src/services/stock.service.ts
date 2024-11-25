import { Injectable } from '@angular/core';
import { stock } from 'src/class/stock';
import { environment } from 'src/environments/environment.prod';
import { GlobalService } from './global.services';

@Injectable({
  providedIn: 'root'
})
export class StockService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
 }
 public Get(id:number): Promise<stock> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/stock_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get",
    id:id
  };

  return this.global.POST(this.url, body)
    .then((response: stock) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
 public GetAll(): Promise<stock[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/stock_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_all"
  };

  return this.global.POST(this.url, body)
    .then((response: stock[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public GetAllFF(flux_financier_id:number): Promise<stock[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/stock_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_all_flux_financier",
    flux_financier_id:flux_financier_id
  };

  return this.global.POST(this.url, body)
    .then((response: stock[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public Add(stock:stock): Promise<number> {
  this.url = environment.maseance + 'maseance/stock_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"add",
    stock:stock,
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
public Update(stock:stock): Promise<boolean> {
  this.url = environment.maseance + 'maseance/stock_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"update",
    stock:stock,
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
  this.url = environment.maseance + 'maseance/stock_manage.php';
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
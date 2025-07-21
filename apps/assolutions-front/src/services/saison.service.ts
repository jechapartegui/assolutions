import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { KeyValuePair } from '@shared/src/lib/autres.interface';
import { Saison_VM } from '@shared/src/lib/saison.interface';

@Injectable({
  providedIn: 'root'
})
export class SaisonService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
 }
 public GetAll(): Promise<Saison_VM[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = 'api/saison/getall';

  return this.global.GET(this.url)
    .then((response: Saison_VM[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Get(id:number): Promise<Saison_VM> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = 'api/saison/get/' + id;
  //  this.url = this.url + "login.php";


  return this.global.GET(this.url)
    .then((response: Saison_VM) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public GetAllLight(): Promise<KeyValuePair[]> {
    this.url = 'api/saison/getall_light';

  return this.global.GET(this.url)
    .then((response: KeyValuePair[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public Add(saison:Saison_VM): Promise<number> {
  this.url = 'api/saison/add';

  return this.global.PUT(this.url, saison)
    .then((response: number) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Update(saison:Saison_VM): Promise<boolean> {
  this.url = 'api/saison/update';

  return this.global.PUT(this.url, saison)
    .then((response: boolean) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Delete(id:number): Promise<boolean> {
  this.url = 'api/seance/delete/' + id;

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


import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { KeyValuePair } from '@shared/compte/src';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GroupeService {
  url = environment.maseance;
  constructor(public global: GlobalService) {
  }

  public Get(id:number): Promise<KeyValuePair> {
    this.url = 'api/groupe/get/' + id;
    //  this.url = this.url + "login.php";
   

    return this.global.GET(this.url)
      .then((response: any) => {
        return response;
      })
      .catch((error: HttpErrorResponse) => {
        console.error('Erreur brute', error);
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
      });
  }
  public GetAll(saison_id:number): Promise<KeyValuePair[]> {
    this.url = 'api/groupe/getall/'  + saison_id;
    //  this.url = this.url + "login.php";
   

    return this.global.GET(this.url)
      .then((response: any) => {
        return response;
      })
      .catch((error: HttpErrorResponse) => {
        console.error('Erreur brute', error);
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
      });
  }
 

  public Add(l:KeyValuePair): Promise<number> {
  this.url = 'api/groupe/add';

  return this.global.PUT(this.url, l)
    .then((response: number) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Update(l:KeyValuePair): Promise<boolean> {
  this.url = 'api/groupe/update';

  return this.global.PUT(this.url, l)
    .then((response: boolean) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Delete(id:number): Promise<boolean> {
  this.url = 'api/groupe/delete/' + id;

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
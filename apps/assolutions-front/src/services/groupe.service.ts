import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { KeyValuePair } from '@shared/lib/autres.interface';
import { HttpErrorResponse } from '@angular/common/http';
import { AppStore } from '../app/app.store';
import { Groupe_VM } from '@shared/index';

@Injectable({
  providedIn: 'root'
})
export class GroupeService {
  url = environment.maseance;
  constructor(public global: GlobalService, public store:AppStore) {
  }

  public Get(id:number): Promise<KeyValuePair> {
    this.url = environment.maseance + 'api/groupe/get/' + id;
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
  public GetAll(saison_id:number =0): Promise<Groupe_VM[]> {
    if(saison_id ===0){
    saison_id = this.store.saison_active().id;
  }
    this.url = environment.maseance + 'api/groupe/getall/'  + saison_id;
    
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
 

  public Add(gr:KeyValuePair, saison_id:number =0): Promise<number> {
  this.url = environment.maseance + 'api/groupe/add';
  if(saison_id ===0){
    saison_id = this.store.saison_active().id
  }
 const l = {
    saison_id: saison_id,
    gr: gr
  };
  return this.global.PUT(this.url, l)
    .then((response: number) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Update(gr:KeyValuePair, saison_id:number =0): Promise<boolean> {
  this.url = environment.maseance + 'api/groupe/update';
if(saison_id ===0){
    saison_id = this.store.saison_active().id
  }
 const l = {
    saison_id: saison_id,
    gr: gr
  };
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
  this.url = environment.maseance + 'api/groupe/delete/' + id;

  return this.global.DELETE(this.url)
    .then((response: boolean) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public AddLien(
      id_objet: number,
      type_objet: string,
      id_groupe: number
    ): Promise<number> {
  this.url = environment.maseance + 'api/groupe/addlien';
  const l = {
    id_objet: id_objet,
    type_objet: type_objet,
    id_groupe: id_groupe
  };
  return this.global.PUT(this.url, l)
    .then((response: number) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public DeleteLien(id: number): Promise<boolean> {
  // encodeURIComponent protège contre les '/' ou caractères spéciaux dans type_objet
   this.url = environment.maseance + 'api/groupe/deletelien';
 const body = {
      id: id, 
    };

    return this.global.POST(this.url, body)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }


}
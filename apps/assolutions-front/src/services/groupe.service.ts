import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { KeyValuePair } from '@shared/src/lib/autres.interface';
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
  public GetAll(saison_id:number =0): Promise<KeyValuePair[]> {
    if(saison_id ===0){
    saison_id = this.global.saison_active
  }
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
 

  public Add(gr:KeyValuePair, saison_id:number =0): Promise<number> {
  this.url = 'api/groupe/add';
  if(saison_id ===0){
    saison_id = this.global.saison_active
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
  this.url = 'api/groupe/update';
if(saison_id ===0){
    saison_id = this.global.saison_active
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

public AddLien(
      id_objet: number,
      type_objet: string,
      id_groupe: number
    ): Promise<number> {
  this.url = 'api/groupe/addlien';
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

public DeleteLien(id_objet: number, type_objet: string, id_groupe: number): Promise<boolean> {
  // encodeURIComponent protège contre les '/' ou caractères spéciaux dans type_objet
  const url = `api/groupe/deletelien/${id_objet}/${encodeURIComponent(type_objet)}/${id_groupe}`;

  return this.global.DELETE(url)
    .then((response: boolean) => response)
    .catch(error => Promise.reject(error));
}

}
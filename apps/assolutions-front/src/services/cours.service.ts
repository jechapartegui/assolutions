import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { KeyValuePair } from '@shared/compte/src/lib/autres.interface';
import { cours } from '@shared/compte/src/lib/cours.interface';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class CoursService {
  url = environment.maseance;
  constructor(public global: GlobalService) {
  }

  public Get(id:number): Promise<cours> {
    this.url = 'api/cours/get/' + id;
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
  public GetAll(saison_id:number): Promise<cours[]> {
    this.url = 'api/cours/getall/'  + saison_id;
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
  public GetAllLight(saison_id:number): Promise<KeyValuePair[]> {
      this.url = 'api/cours/getall_light/'  + saison_id;
  
    return this.global.GET(this.url)
      .then((response: KeyValuePair[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

  public Add(l:cours): Promise<number> {
  this.url = 'api/cours/add';

  return this.global.PUT(this.url, l)
    .then((response: number) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Update(l:cours): Promise<boolean> {
  this.url = 'api/cours/update';

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
  this.url = 'api/cours/delete/' + id;

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
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { HttpErrorResponse } from '@angular/common/http';
import { lieu } from '@shared/src/lib/lieu.interface';
import { KeyValuePair } from '@shared/src/lib/autres.interface';

@Injectable({
  providedIn: 'root'
})
export class LieuNestService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
  }

  public Get(id:number): Promise<lieu> {
    this.url = 'api/lieu/get/' + id;
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
  public GetAll(): Promise<lieu[]> {
    this.url = 'api/lieu/getall';
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
  public GetAllLight(): Promise<KeyValuePair[]> {
      this.url = 'api/lieu/getall_light';
  
    return this.global.GET(this.url)
      .then((response: KeyValuePair[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

  public Add(l:lieu): Promise<number> {
  this.url = 'api/lieu/add';

  return this.global.PUT(this.url, l)
    .then((response: number) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Update(l:lieu): Promise<boolean> {
  this.url = 'api/lieu/update';

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
  this.url = 'api/lieu/delete/' + id;

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
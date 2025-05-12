import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { HttpErrorResponse } from '@angular/common/http';
import { lieu } from '@shared/compte/src/lib/lieu.interface';

@Injectable({
  providedIn: 'root'
})
export class LieuNestService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
  }

  public Get(): Promise<lieu> {
    this.url = 'api/lieu/get';
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
}
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { HttpErrorResponse } from '@angular/common/http';
import { AdherentSeance } from '@shared/compte/src/lib/seance.interface';

@Injectable({
  providedIn: 'root'
})
export class MaSeanceNestService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
  }

  public Get(): Promise<AdherentSeance[]> {
    this.url = 'api/member/my_seance';
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
  public Prof(): Promise<AdherentSeance[]> {
    this.url = 'api/member/my_prof';
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
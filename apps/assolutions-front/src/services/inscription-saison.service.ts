import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { InscriptionSaison_VM } from '@shared/src/lib/inscription_saison.interface';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class InscriptionSaisonService {
   url = environment.maseance;
    constructor(public global: GlobalService) {
    }
  
    public Get(id:number): Promise<InscriptionSaison_VM> {
      this.url = 'api/inscription_saison/get/' + id;
      //  this.url = this.url + "login.php";
     
  
      return this.global.GET(this.url)
        .then((response: InscriptionSaison_VM) => {
          return response;
        })
        .catch((error: HttpErrorResponse) => {
          console.error('Erreur brute', error);
          const message = error?.message || 'Erreur inconnue';
          console.error(message);        // Gestion de l'erreur
          return Promise.reject(message);
        });
    }
    public GetAllSaison(saison:number): Promise<InscriptionSaison_VM[]> {
      this.url = 'api/inscription_saison/getall_saison/' + saison;
      //  this.url = this.url + "login.php";
     
  
      return this.global.GET(this.url)
        .then((response: InscriptionSaison_VM[]) => {
          return response;
        })
        .catch((error: HttpErrorResponse) => {
          console.error('Erreur brute', error);
          const message = error?.message || 'Erreur inconnue';
          console.error(message);        // Gestion de l'erreur
          return Promise.reject(message);
        });
    }
     public GetAllRider(rider:number): Promise<InscriptionSaison_VM[]> {
      this.url = 'api/inscription_saison/getall_rider/' + rider;
      //  this.url = this.url + "login.php";
     
  
      return this.global.GET(this.url)
        .then((response: InscriptionSaison_VM[]) => {
          return response;
        })
        .catch((error: HttpErrorResponse) => {
          console.error('Erreur brute', error);
          const message = error?.message || 'Erreur inconnue';
          console.error(message);        // Gestion de l'erreur
          return Promise.reject(message);
        });
    }
  
    public Add(l:InscriptionSaison_VM): Promise<InscriptionSaison_VM> {
    this.url = 'api/inscription_saison/add';
  
    return this.global.PUT(this.url, l)
      .then((response: InscriptionSaison_VM) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Delete(id:number) {
    this.url = 'api/inscription_saison/delete/' + id;
  
    return this.global.DELETE(this.url)
      .then(() => {
        return;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
}
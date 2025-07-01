import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { SeanceProfesseurVM } from '@shared/src';
import { KeyValue } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class SeanceprofService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
 }
 public Get(id:number): Promise<SeanceProfesseurVM> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = 'api/seance_prof/get/' + id;
    //  this.url = this.url + "login.php";
   

    return this.global.GET(this.url)
    .then((response: SeanceProfesseurVM) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
 public GetAllBySeance(seance_id:number): Promise<SeanceProfesseurVM[]> {
   this.url = 'api/seance_prof/getall_seance/' + seance_id;
    //  this.url = this.url + "login.php";
   

    return this.global.GET(this.url)
    .then((response: SeanceProfesseurVM[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public GetAllByProf(professeur_id:number): Promise<SeanceProfesseurVM[]> {
   this.url = 'api/seance_prof/getall_prof/' + professeur_id;
    //  this.url = this.url + "login.php";
   

    return this.global.GET(this.url)
    .then((response: SeanceProfesseurVM[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}


public Add(seance_prof:SeanceProfesseurVM) : Promise<number> {
  this.url = 'api/seance_prof/add';

  return this.global.PUT(this.url, seance_prof)
    .then((response: number) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Update(seance_prof:SeanceProfesseurVM): Promise<boolean> {
  this.url = 'api/seance_prof/update';

  return this.global.PUT(this.url, seance_prof)
    .then((response: boolean) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public UpdateSeance(seance_profs:SeanceProfesseurVM[], id:number): Promise<KeyValue<number, boolean>> {
 this.url = 'api/seance_prof/update_list';

  return this.global.PUT(this.url, seance_profs)
    .then((response: KeyValue<number, boolean>) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Delete(id:number): Promise<boolean> {
  this.url = 'api/seance_prof/delete/' + id;

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


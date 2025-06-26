import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import {  InscriptionSeance } from '../class/inscription';
import { SeanceVM } from '@shared/src/lib/seance.interface';

@Injectable({
  providedIn: 'root'
})
export class SeancesService {
  static instance: SeancesService;
  static get ListeSeance(): SeanceVM[] {
    return SeancesService.Seances;
  }

  constructor(public global: GlobalService) {
    SeancesService.instance = this;
  }

  url = environment.maseance;

  static Seances: SeanceVM[];

  public Update(seance: SeanceVM): Promise<boolean> {
    this.url = environment.maseance + "api/seance/update"; 
    //  this.url = this.url + "login.php";
    const body = {
      seance: seance,
    };

    return this.global.PUT(this.url, body)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }
  
  public Delete(id: number): Promise<boolean> {
    this.url = environment.maseance + "api/seance/get/" + id; 
    //  this.url = this.url + "login.php";
    

    return this.global.DELETE(this.url)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }




  public Add(seance: SeanceVM): Promise<number> {
    this.url = environment.maseance + "api/seance/add/"
    //  this.url = this.url + "login.php";
    const body = {
      seance: seance,
    };

    return this.global.PUT(this.url, body)
      .then((response: number) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public AddRange(seance: SeanceVM, date_debut_serie:Date, date_fin_serie:Date, jour_semaine:string): Promise<number[]> {
    this.url = environment.maseance + "api/seance/add_range/"
    //  this.url = this.url + "login.php";
    const body = {
      seance: seance,
      date_debut_serie:date_debut_serie,
      date_fin_serie:date_fin_serie,
      jour_semaine:jour_semaine
    };

    return this.global.PUT(this.url, body)
      .then((response: number[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }


  public GetSeances(): Promise<SeanceVM[]> {
    this.url = environment.maseance + "api/seance/getall/" + this.global.saison_active;
    return this.global.GET(this.url)
      .then((response: SeanceVM[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

  public GetPlageDate(date_debut:string, date_fin:string): Promise<SeanceVM[]> {
    this.url = environment.maseance + "api/seance/getbydate/" + this.global.saison_active + "/" + date_debut + "/" + date_fin;
    //  this.url = this.url + "login.php";

    return this.global.GET(this.url)
      .then((response: SeanceVM[]) => {
        SeancesService.Seances = response;
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }
 

  public Get(id: number): Promise<SeanceVM> {
    this.url = environment.maseance + "api/seance/get/" + id; 
    //  this.url = this.url + "login.php";

    return this.global.GET(this.url)
      .then((response: SeanceVM) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  public UpdatePresence(item: InscriptionSeance): Promise<boolean> {
    this.url = environment.maseance + 'maseance/inscriptionseance_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "update",
      inscription: item,
    };

    return this.global.POST(this.url, body)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }
  public ChargerSeance(id: number): Promise<InscriptionSeance[]> {
    this.url = environment.maseance + 'maseance/seance_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "load_seance",
      id: id,
    };

    return this.global.POST(this.url, body)
      .then((response: InscriptionSeance[]) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

}
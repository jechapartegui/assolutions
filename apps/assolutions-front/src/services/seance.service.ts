import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import {  InscriptionSeance } from '../class/inscription';
import { Seance_VM } from '@shared/lib/seance.interface';
import { AppStore } from '../app/app.store';

@Injectable({
  providedIn: 'root'
})
export class SeancesService {
  static instance: SeancesService;
  static get ListeSeance(): Seance_VM[] {
    return SeancesService.Seances;
  }

  constructor(public global: GlobalService, public store :AppStore) {
    SeancesService.instance = this;
  }

  url = environment.maseance;

  static Seances: Seance_VM[];

  public Update(seance: Seance_VM): Promise<boolean> {
      this.url = environment.maseance +  "api/seance/update"; 
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
  
  public Delete(id: number) {
      this.url = environment.maseance +  "api/seance/delete/" + id; 
    //  this.url = this.url + "login.php";
    

    return this.global.DELETE(this.url)
      .then(() => {
        return;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }




  public Add(seance: Seance_VM): Promise<Seance_VM> {
     this.url = environment.maseance +  "api/seance/add/"
    //  this.url = this.url + "login.php";
    const body = {
      seance: seance,
    };

    return this.global.PUT(this.url, body)
      .then((response: Seance_VM) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public AddRange(seance: Seance_VM, date_debut_serie:Date, date_fin_serie:Date, jour_semaine:string): Promise<number[]> {
    this.url = environment.maseance +  "api/seance/add_range/"
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

  public GetSeancePublic(saison:number): Promise<Seance_VM[]> {
    this.url = environment.maseance +  "api/seance/getall_public/" + saison;
    return this.global.GET(this.url)
      .then((response: Seance_VM[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }


  public GetSeances(saison:number  = this.store.saison_active().id): Promise<Seance_VM[]> {
   this.url = environment.maseance +  "api/seance/getall/" + saison;
    return this.global.GET(this.url)
      .then((response: Seance_VM[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

  public GetPlageDate(date_debut:string, date_fin:string): Promise<Seance_VM[]> {
    this.url = environment.maseance +  "api/seance/getbydate/" + this.store.saison_active().id + "/" + date_debut + "/" + date_fin;
    //  this.url = this.url + "login.php";

    return this.global.GET(this.url)
      .then((response: Seance_VM[]) => {
        SeancesService.Seances = response;
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }
 

  public Get(id: number): Promise<Seance_VM> {
    this.url = environment.maseance +  "api/seance/get/" + id; 
    //  this.url = this.url + "login.php";

    return this.global.GET(this.url)
      .then((response: Seance_VM) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  public UpdatePresence(item: InscriptionSeance): Promise<boolean> {
   this.url = environment.maseance +  'maseance/inscriptionseance_manage.php';
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
     this.url = environment.maseance +  'maseance/seance_manage.php';
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
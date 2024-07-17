import { Injectable } from '@angular/core';
import { StatutSeance, seance } from 'src/class/seance';
import { environment } from 'src/environments/environment.prod';
import { GlobalService } from './global.services';
import { Inscription, InscriptionSeance } from 'src/class/inscription';
import { ErrorService } from './error.service';

@Injectable({
  providedIn: 'root'
})
export class SeancesService {
  static instance: SeancesService;
  static get ListeSeance(): seance[] {
    return SeancesService.Seances;
  }

  constructor(public global: GlobalService) {
    SeancesService.instance = this;
  }

  url = environment.maseance;

  static Seances: seance[];

  public Update(seance: seance): Promise<boolean> {
    this.url = environment.maseance + 'maseance/seance_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "update",
      seance: seance,
    };

    return this.global.POST(this.url, body)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }
  
  public Delete(id: number): Promise<boolean> {
    this.url = environment.maseance + 'maseance/seance_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "delete",
      id: id,
    };

    return this.global.POST(this.url, body)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }




  public Add(seance: seance): Promise<number> {
    this.url = environment.maseance + 'maseance/seance_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "add",
      seance: seance,
    };

    return this.global.POST(this.url, body)
      .then((response: number) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public AddRange(seance: seance, date_debut_serie:Date, date_fin_serie:Date, jour_semaine:string): Promise<seance[]> {
    this.url = environment.maseance + 'maseance/seance_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "add_range",
      seance: seance,
      date_debut_serie:date_debut_serie,
      date_fin_serie:date_fin_serie,
      jour_semaine:jour_semaine
    };

    return this.global.POST(this.url, body)
      .then((response: seance[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }


  public GetSeances(all:boolean =false): Promise<seance[]> {
    this.url = environment.maseance + "maseance/seance_manage.php";
    const body = {
      command: "get_all",
      all:all
    };

    return this.global.POST(this.url, body)
      .then((response: seance[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public GetSeancesSeason(season_id: number,all:boolean =false): Promise<seance[]> {
    this.url = environment.maseance + "maseance/seance_manage.php";
    const body = {
      command: "get_all",
      season_id: season_id,
      all:all
    };

    return this.global.POST(this.url, body)
      .then((response: seance[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public GetPlageDate(): Promise<seance[]> {
    this.url = environment.maseance + 'maseance/seance_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "get_seance_plagedate"
    };

    return this.global.POST(this.url, body)
      .then((response: seance[]) => {
        SeancesService.Seances = response;
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  public Get(id: number): Promise<seance> {
    this.url = environment.maseance + 'maseance/seance_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "get",
      id: id
    };

    return this.global.POST(this.url, body)
      .then((response: seance) => {
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


  
  public TerminerSeances(list_id: number[]): Promise<number> {
    this.url = environment.maseance + 'maseance/seance_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "terminer_seances",
      list_id: list_id,
    };

    return this.global.POST(this.url, body)
      .then((response: number) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }
  public MAJStatutSeance(id: number, statut:string): Promise<boolean> {
    this.url = environment.maseance + 'maseance/seance_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "maj_statut_seance",
      id: id,
      statut:statut
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
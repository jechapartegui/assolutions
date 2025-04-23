import { Injectable } from '@angular/core';
import { SeanceProf } from '../class/seanceprof';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';

@Injectable({
  providedIn: 'root'
})
export class SeanceprofService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
 }
 public Get(id:number): Promise<SeanceProf> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/seanceprofesseur_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get",
    id:id
  };

  return this.global.POST(this.url, body)
    .then((response: SeanceProf) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
 public GetAllBySeance(seance_id:number): Promise<SeanceProf[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/seanceprofesseur_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_al_get_all_by_seance",
    seance_id:seance_id
  };

  return this.global.POST(this.url, body)
    .then((response: SeanceProf[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public GetAllByProf(professeur_id:number): Promise<SeanceProf[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/seanceprofesseur_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_all_by_prof",
    professeur_id:professeur_id
  };

  return this.global.POST(this.url, body)
    .then((response: SeanceProf[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}


public Add(seance_professeur:SeanceProf): Promise<number> {
  this.url = environment.maseance + 'maseance/seanceprofesseur_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"add",
    seance_professeur:seance_professeur,
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
public Update(seance_professeur:SeanceProf): Promise<boolean> {
  this.url = environment.maseance + 'maseance/seanceprofesseur_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"update",
    seance_professeur:seance_professeur,
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
public UpdateSeance(profs:SeanceProf[], id:number): Promise<boolean> {
  this.url = environment.maseance + 'maseance/seanceprofesseur_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"update_list",
    profs:profs,
    id:id
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
public Delete(id:number): Promise<boolean> {
  this.url = environment.maseance + 'maseance/seanceprofesseur_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"delete",
    id:id,
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
}


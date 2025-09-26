import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { FullInscriptionSeance_VM, InscriptionSeance_VM } from '@shared/lib/inscription_seance.interface'

@Injectable({
  providedIn: 'root'
})
export class InscriptionSeanceService {
  url = environment.maseance;
  constructor(public global: GlobalService) {
 }
 public Get(id:number): Promise<InscriptionSeance_VM> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'api/inscription_seance/get/' + id;
  //  this.url = this.url + "login.php";

  return this.global.GET(this.url)
    .then((response: InscriptionSeance_VM) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public GetFull(id:number): Promise<FullInscriptionSeance_VM> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
 this.url = environment.maseance + 'api/inscription_seance/get_full/' + id;
  //  this.url = this.url + "login.php";

  return this.global.GET(this.url)

    .then((response: FullInscriptionSeance_VM) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public GetAdherentCompte(id:string, seance_id:number): Promise<FullInscriptionSeance_VM[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
 this.url = environment.maseance + 'api/inscription_seance/get_adherent_compte/' + id + '/' + seance_id;
  //  this.url = this.url + "login.php";

  return this.global.GET(this.url)

    .then((response: FullInscriptionSeance_VM[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public GetAdherentPersonne(id:number, seance_id:number): Promise<FullInscriptionSeance_VM[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
 this.url = environment.maseance + 'api/inscription_seance/get_adherent_personne/' + id + '/' + seance_id;
  //  this.url = this.url + "login.php";

  return this.global.GET(this.url)

    .then((response: FullInscriptionSeance_VM[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public FaireEssai(personId:number, sessionId:number): Promise<number> {
 this.url = environment.maseance + 'api/inscription_seance/faire_essai';
const body = {
  personId :personId,
  sessionId:sessionId
 }

    return this.global.POST(this.url, body)
      .then((response: number) => {
        return response;
      })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
  }
 
public GetAllRiderSaison(rider_id:number, saison_id:number): Promise<InscriptionSeance_VM[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
this.url = `api/inscription_seance/get_all_rider_saison/${rider_id}/${saison_id}`;

  //  this.url = this.url + "login.php";

  return this.global.GET(this.url)
    .then((response: InscriptionSeance_VM[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public GetAllSeance(seance_id:number): Promise<InscriptionSeance_VM[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
 this.url = environment.maseance + 'api/inscription_seance/get_all_seance/' + seance_id;
  //  this.url = this.url + "login.php";

  return this.global.GET(this.url)
    .then((response: any) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public GetAllSeanceFull(seance_id:number): Promise<FullInscriptionSeance_VM[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
 this.url = environment.maseance + 'api/inscription_seance/get_all_seance_full/' + seance_id;
  //  this.url = this.url + "login.php";

  return this.global.GET(this.url)
    .then((response: any) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public Add(inscription:InscriptionSeance_VM): Promise<number> {
  this.url = environment.maseance + 'api/inscription_seance/add';

  return this.global.PUT(this.url, inscription)
    .then((response: number) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Update(inscription:InscriptionSeance_VM) {
    this.url = environment.maseance + 'api/inscription_seance/update';

  return this.global.PUT(this.url, inscription)
    .then(() => {
      return ;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Delete(id:number): Promise<boolean> {
 this.url = environment.maseance + 'api/inscription_seance/delete/';
const body = {
      id: id, 
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


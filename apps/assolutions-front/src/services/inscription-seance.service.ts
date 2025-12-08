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

public MAJ(InscriptionSeance_VM:InscriptionSeance_VM): Promise<number> {
 this.url = environment.maseance + 'api/inscription_seance/maj';
const body = {
  InscriptionSeance_VM :InscriptionSeance_VM
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

}


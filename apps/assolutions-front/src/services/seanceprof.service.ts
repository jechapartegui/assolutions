import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { SeanceProfesseur_VM } from '@shared/lib/seance.interface';

@Injectable({
  providedIn: 'root'
})
export class SeanceprofService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
 }
 public Update(seance_id:number, liste_seance_prof : SeanceProfesseur_VM[]): Promise<SeanceProfesseur_VM[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'api/seance/update_seance_prof';
    //  this.url = this.url + "login.php";
  const body = {
    seance_id: seance_id,
    liste_seance_prof: liste_seance_prof
  };

    return this.global.POST(this.url, body)
    .then((response: SeanceProfesseur_VM[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

}


import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from 'src/environments/environment.prod';
import { fluxfinancier } from 'src/class/fluxfinancier';
import { KeyValuePair } from 'src/class/keyvaluepair';

@Injectable({
  providedIn: 'root',
})
export class AddInfoService {
  url = environment.maseance;
  constructor(public global: GlobalService) {}
  public GetLV(name: string): Promise<KeyValuePair[]> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/addinfo_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: 'get_lv',
      name: name,
    };

    return this.global
      .POST(this.url, body)
      .then((response: KeyValuePair[]) => {
        return response;
      })
      .catch((error) => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
}

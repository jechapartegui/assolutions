import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from 'src/environments/environment.prod';
import { adherent } from 'src/class/adherent';
import { KeyValuePair } from 'src/class/keyvaluepair';
import { Professeur } from 'src/class/professeur';

@Injectable({
  providedIn: 'root'
})
export class AdherentService {

  constructor(public global: GlobalService) {
  }
  url = environment.maseance;
  public Get(id: number): Promise<adherent[]> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/adherents_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "get",
      id: id
    };

    return this.global.POST(this.url, body)
      .then((response: adherent[]) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Add(adherent: adherent): Promise<number> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/adherents_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "add",
      adherent: adherent
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
  public Update(adherent: adherent): Promise<boolean> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/adherents_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "update",
      adherent: adherent
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
  public Get_Adherent_My(id: number): Promise<adherent> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/adherents_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "get_adherent_my",
      id: id
    };

    return this.global.POST(this.url, body)
      .then((response: adherent) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Get_Adherent_Prof(id: number): Promise<adherent> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/adherents_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "get_adherent_prof",
      id: id
    };

    return this.global.POST(this.url, body)
      .then((response: adherent) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Get_Adherent_Admin(id: number): Promise<adherent> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/adherents_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "get_adherent_admin",
      id: id
    };

    return this.global.POST(this.url, body)
      .then((response: adherent) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public GetProf(): Promise<Professeur[]> {
    this.url = environment.maseance + "maseance/professeur_manage.php";
    const body = {
      command: "get_all",
    };

    return this.global.POST(this.url, body)
      .then((response: Professeur[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public GetAllThisSeason(): Promise<adherent[]> {
    const body = {
      command: "get_all"
    }
    return this.GetAll(body);
  }
  public GetAllSeason(season_id: number): Promise<adherent[]> {
    const body = {
      command: "get_all",
      season_id: season_id
    }
    return this.GetAll(body);
  }
  public GetAll(body): Promise<adherent[]> {
    this.url = environment.maseance + 'maseance/adherents_manage.php';

    return this.global.POST(this.url, body)
      .then((response: adherent[]) => {

        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }
  public GetAllLight(body): Promise<KeyValuePair[]> {
    this.url = environment.maseance + 'maseance/adherents_manage.php';

    return this.global.POST(this.url, body)
      .then((response: KeyValuePair[]) => {

        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }
  public GetAdherentAdhesion(): Promise<adherent[]> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/adherents_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "adherents_adhesions"
    };

    return this.global.POST(this.url, body)
      .then((response: adherent[]) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
}

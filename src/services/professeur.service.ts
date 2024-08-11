import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { GlobalService } from './global.services';
import { Professeur } from 'src/class/professeur';

@Injectable({
  providedIn: 'root'
})
export class ProfesseurService {
  constructor(public global: GlobalService) {
  }
  url = environment.maseance;
  public Get(id: number): Promise<Professeur> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/professeur_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "get",
      id: id
    };

    return this.global.POST(this.url, body)
      .then((response: Professeur) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Add(professeur: Professeur): Promise<number> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/professeur_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "add",
      professeur: professeur
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
  public Delete(id: number): Promise<boolean> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/professeur_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "delete",
      id: id
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
  public Update(adherent: Professeur): Promise<boolean> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/professeur_manage.php';
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
  public GetProf(): Promise<Professeur[]> {
    this.url = environment.maseance + "maseance/professeur_manage.php";
    const body = {
      command: "get_all_saison",
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
  public GetProfAll(): Promise<Professeur[]> {
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
}

import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { GlobalService } from './global.services';
import { prof_saison, professeur, Professeur } from 'src/class/professeur';

@Injectable({
  providedIn: 'root'
})
export class ProfesseurService {
  constructor(public global: GlobalService) {
  }
  url = environment.maseance;
  public Get(id: number): Promise<professeur> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/professeur_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "get",
      id: id
    };

    return this.global.POST(this.url, body)
      .then((response: professeur) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Add(professeur: professeur): Promise<boolean> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/professeur_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "add",
      professeur: professeur
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
  public Update(professeur: professeur): Promise<boolean> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/professeur_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "update",
      professeur: professeur
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
  public GetProf(): Promise<professeur[]> {
    this.url = environment.maseance + "maseance/professeur_manage.php";
    const body = {
      command: "get_all_saison",
    };

    return this.global.POST(this.url, body)
      .then((response: professeur[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public GetProfAll(): Promise<professeur[]> {
    this.url = environment.maseance + "maseance/professeur_manage.php";
    const body = {
      command: "get_all",
    };

    return this.global.POST(this.url, body)
      .then((response: professeur[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public AddSaison(professeur_saison:prof_saison): Promise<boolean>{
    this.url = environment.maseance + "maseance/professeursaison_manage.php";
    const body = {
      command: "add",
      professeur_saison:professeur_saison
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
  public DeleteSaison(professeur_saison:prof_saison): Promise<boolean>{
    this.url = environment.maseance + "maseance/professeursaison_manage.php";
    const body = {
      command: "delete",
      professeur_saison:professeur_saison
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

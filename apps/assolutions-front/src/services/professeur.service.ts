import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { ProfesseurVM, ProfSaisonVM } from '@shared/src';

@Injectable({
  providedIn: 'root'
})
export class ProfesseurService {
  constructor(public global: GlobalService) {
  }
  url = environment.maseance;
  public Get(id: number): Promise<ProfesseurVM> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/professeur_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "get",
      id: id
    };

    return this.global.POST(this.url, body)
      .then((response: ProfesseurVM) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Add(professeur: ProfesseurVM): Promise<boolean> {
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
  public Update(professeur: ProfesseurVM): Promise<boolean> {
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
  public GetProf(): Promise<ProfesseurVM[]> {
    let saison_id= this.global.saison_active;
  this.url = 'api/prof/get_prof_saison/' + saison_id;
    //  this.url = this.url + "login.php";
   

    return this.global.GET(this.url)
      .then((response: ProfesseurVM[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public GetProfAll(): Promise<ProfesseurVM[]> {
    this.url = environment.maseance + "maseance/professeur_manage.php";
    const body = {
      command: "get_all",
    };

    return this.global.POST(this.url, body)
      .then((response: ProfesseurVM[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public AddSaison(professeur_saison:ProfSaisonVM): Promise<boolean>{
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
  public DeleteSaison(professeur_saison:ProfSaisonVM): Promise<boolean>{
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

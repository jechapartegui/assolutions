import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { Professeur_VM, ProfSaisonVM } from '@shared/src/lib/prof.interface';

@Injectable({
  providedIn: 'root'
})
export class ProfesseurService {
  constructor(public global: GlobalService) {
  }
  url = environment.maseance;
  public Get(id: number): Promise<Professeur_VM> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/professeur_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "get",
      id: id
    };

    return this.global.POST(this.url, body)
      .then((response: Professeur_VM) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Add(professeur: Professeur_VM): Promise<boolean> {
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
  public Update(professeur: Professeur_VM): Promise<boolean> {
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
  public GetProf(): Promise<Professeur_VM[]> {
    let saison_id= this.global.saison_active;
  this.url = 'api/prof/get_prof_saison/' + saison_id;
    //  this.url = this.url + "login.php";
   

    return this.global.GET(this.url)
      .then((response: Professeur_VM[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public GetProfAll(): Promise<Professeur_VM[]> {
    this.url = environment.maseance + "maseance/professeur_manage.php";
    const body = {
      command: "get_all",
    };

    return this.global.POST(this.url, body)
      .then((response: Professeur_VM[]) => {
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

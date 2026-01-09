import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { ContratLight_VM, Professeur_VM, ProfSaisonVM } from '@shared/lib/prof.interface';
import { AppStore } from '../app/app.store';

@Injectable({
  providedIn: 'root'
})
export class ProfesseurService {
 
  constructor(public global: GlobalService, public store:AppStore) {
  }
  url = environment.maseance;
  public Get(id: number): Promise<Professeur_VM> {
  this.url = environment.maseance + 'api/prof/get/' + id;
    //  this.url = this.url + "login.php";
   

    return this.global.GET(this.url)
      .then((response: Professeur_VM) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Add(s: Professeur_VM): Promise<boolean> {
     this.url = environment.maseance +  "api/prof/add"; 

    return this.global.PUT(this.url, s)
      .then((response: boolean) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Delete(id: number): Promise<boolean> {
     this.url = environment.maseance +  "api/prof/delete/" ; 

    return this.global.POST(this.url, id)
      .then((response: boolean) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Update(s: Professeur_VM): Promise<boolean> {
     this.url = environment.maseance +  "api/prof/update"; 

    return this.global.PUT(this.url, s)
      .then((response: boolean) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public GetProf(): Promise<Professeur_VM[]> {
    let saison_id= this.store.saison_active_id();
  this.url = environment.maseance + 'api/prof/get_prof_saison/' + saison_id;
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
   this.url = environment.maseance + 'api/prof/getall/';
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
   AddContrat(contrat:ContratLight_VM, prof_id:number): Promise<boolean> {
     this.url = environment.maseance + 'api/prof/add_contrat';

         const body = {
      contrat: contrat,
      prof_id: prof_id
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
    UpdateContrat(contrat:ContratLight_VM, prof_id:number): Promise<boolean> {
     this.url = environment.maseance + 'api/prof/update_contrat';

         const body = {
      contrat: contrat,
      prof_id: prof_id
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

import { Injectable } from '@angular/core';
import {  projet } from '../class/projet';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { KeyValuePair } from '@shared/lib/autres.interface';
import { Lieu_VM } from '@shared/lib/lieu.interface';
import { Groupe_VM } from '@shared/lib/groupe.interface';
import { Saison_VM } from '@shared/lib/saison.interface';
import { Projet_VM, ProjetView } from '@shared/index';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ProjetService {


  constructor(public global: GlobalService) {
  }
  url = environment.maseance;




  public GetActiveSaison(project_id:number): Promise<Saison_VM> {
      this.url = environment.maseance + 'api/saison/active_saison/' + project_id;
  
    return this.global.GET(this.url)
        .then((response: Saison_VM) => {
  
          return response;
        })
        .catch(error => {
          // Gestion de l'erreur
          return Promise.reject(error);
        });
    }
    
  public Login(email:string, password:string): Promise<Projet_VM> {
      this.url = environment.maseance + 'api/project/login';
    //  this.url = this.url + "login.php";
    const body = {
      email: email.toLowerCase(),
      password: password
    };

    return this.global.POST(this.url, body)
        .then((response: Projet_VM) => {
  
          return response;
        })
        .catch(error => {
          // Gestion de l'erreur
          return Promise.reject(error);
        });
    }
     public ReinitMDP(login:string):Promise<boolean>{
    this.url = environment.maseance + "api/project/reinit_mdp";
  const payload = { login: login.toLowerCase() };   // <-- objet JSON

  return this.global.POST(this.url, payload)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }



      public CheckMDP(password:string): Promise<boolean> {
      this.url = environment.maseance + 'api/project/check_mdp/';
        const body = {
        password: password
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
  



  public Get(id:number): Promise<Projet_VM> {
    this.url = environment.maseance + 'api/project/get/' + id;
    //  this.url = this.url + "login.php";
   

    return this.global.GET(this.url)
      .then((response: Projet_VM) => {
        return response;
      })
      .catch((error: HttpErrorResponse) => {
        console.error('Erreur brute', error);
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
      });
  }
  
  public Add(l:Projet_VM): Promise<Projet_VM> {
  this.url = environment.maseance + 'api/project/add';

  return this.global.PUT(this.url, l)
    .then((response: number) => {
      l.id = response;
      return l;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Update(l:Projet_VM): Promise<boolean> {
  this.url = environment.maseance + 'api/project/update';
  return this.global.PUT(this.url, l)
    .then((response: boolean) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Delete(id:number) {
  this.url = environment.maseance + 'api/project/delete/';
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
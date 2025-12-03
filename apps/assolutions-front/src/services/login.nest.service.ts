import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { HttpErrorResponse } from '@angular/common/http';
import { ProjetView, Compte_VM } from '@shared/lib/compte.interface';

@Injectable({
  providedIn: 'root'
})
export class LoginNestService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
  }

  public Login(email: string, password: string): Promise<Compte_VM> {
    this.url = environment.maseance + 'api/auth/login';
    //  this.url = this.url + "login.php";
    const body = {
      email: email.toLowerCase(),
      password: password
    };

    return this.global.POST(this.url, body)
    .then((response: { token: string; compte: Compte_VM }) => {      
        localStorage.setItem('auth_token', response.token);
        return response.compte;
      })
      .catch((error: HttpErrorResponse) => {
        console.error('Erreur brute', error);
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
      });
  }

  public GetProject(id:number): Promise<ProjetView[]> {
    this.url = environment.maseance + 'api/auth/get_project/' + id;
    //  this.url = this.url + "login.php";
   

    return this.global.GET(this.url)
      .then((response: ProjetView[]) => {
        console.log(response);
        return response;
      })
      .catch((error: HttpErrorResponse) => {
        console.error('Erreur brute', error);
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
      });
  }






  public ReinitMDP(login:string):Promise<boolean>{
    this.url = environment.maseance + "api/auth/reinit_mdp";
  const payload = { login: login.toLowerCase() };   // <-- objet JSON

  return this.global.POST(this.url, payload)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }


}
export class project_login {
  public id: number;
  public nom: string;
  public adherent: boolean;
  public prof: boolean;
  public admin: boolean;
  public active_saison: number;
  public actif:boolean;
}
export class retour_login {
  public compte:Compte_VM;
  public projets:project_login[];
  public selected_projet:project_login;
}
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { HttpErrorResponse } from '@angular/common/http';
import { compte } from '@shared/compte/src/lib/compte.interface';

@Injectable({
  providedIn: 'root'
})
export class LoginNestService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
  }
  public PreLogin(username: string){
    this.url = 'api/auth/prelogin';
    //  this.url = this.url + "login.php";
    const body = {
      email: username,
    };

    return this.global.POST(this.url, body)
      .then((response: any) => {
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
  public Login(email: string, password: string): Promise<compte> {
    this.url = 'api/auth/login';
    //  this.url = this.url + "login.php";
    const body = {
      email: email,
      password: password
    };

    return this.global.POST(this.url, body)
      .then((response: any) => {
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

  public GetProject(id:number): Promise<{id:number, nom:string, prof:boolean, adherent:boolean, admin:boolean}[]> {
    this.url = 'api/auth/get_project';
    //  this.url = this.url + "login.php";
    const body = {
      id: id
    };

    return this.global.POST(this.url, body)
      .then((response: any) => {
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




  public Logout(): Promise<boolean> {
    this.url = environment.maseance + 'maseance/login.php';
    //  this.url = this.url + "login.php";
    const body = {
      logout: true,
    };

    return this.global.POST(this.url, body)
      .then((response: boolean) => {
        GlobalService.is_logged_in = false;
        GlobalService.instance.updateMenuType(null);
        GlobalService.instance.updateProjet(null);
        GlobalService.instance.updateSelectedMenuStatus(null);
        GlobalService.instance.updateLoggedin(false);
        GlobalService.instance.updateCompte(null);
        return response;
      })
      .catch(error => {
        GlobalService.instance.updateLoggedin(false);
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

  public RenvoiToken(username):Promise<boolean>{
    this.url = environment.maseance + "maseance/login.php";
    const body = {
      command: "renvoi_token",
      username: username
    };

    return this.global.POST(this.url, body)
      .then((response: boolean) => {
        console.log(response);
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }
  public ReinitMDP(username):Promise<boolean>{
    this.url = environment.maseance + "maseance/login.php";
    const body = {
      command: "reinit_mdp",
      username: username
    };

    return this.global.POST(this.url, body)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  public CheckReinitMDP(login: string, token: string): Promise<boolean> {
    this.url = environment.maseance + "maseance/compte_manage.php";
    const body = {
      command: "check_reinit",
      login: login,
      token: token
    };

    return this.global.POST(this.url, body)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  public ValidReinitMDP(login: string, password: string, token: string): Promise<boolean> {
    this.url = environment.maseance + "maseance/compte_manage.php";
    const body = {
      command: "valid_reinit_mdp",
      login: login,
      token: token,
      password: password
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
  public compte:compte;
  public projets:project_login[];
  public selected_projet:project_login;
}
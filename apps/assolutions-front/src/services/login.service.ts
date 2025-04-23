import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { compte } from '@shared/compte/src/lib/compte.interface';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
  }
  public Login(username: string, password: string){
    this.url = environment.maseance + 'maseance/login.php';
    //  this.url = this.url + "login.php";
    const body = {
      username: username,
      password: password
    };

    return this.global.POST(this.url, body)
      .then((response: retour_login) => {
        GlobalService.is_logged_in = true;        
        GlobalService.instance.updateCompte(response.compte);
        GlobalService.instance.updateOtherProject(response.projets)
        if(response.selected_projet){
          GlobalService.instance.updateProjet(response.selected_projet);
          if (response.selected_projet.adherent) {
            GlobalService.instance.updateMenuType("ADHERENT");
            GlobalService.instance.updateSelectedMenuStatus("MENU");
          }
          if (response.selected_projet.prof) {
            GlobalService.instance.updateMenuType("PROF");
            GlobalService.instance.updateSelectedMenuStatus("MENU");
          }
          if (response.selected_projet.admin) {
            GlobalService.instance.updateMenuType("ADMIN");
            GlobalService.instance.updateSelectedMenuStatus("MENU");
          }        
        }
      })
      .catch(error => {
        GlobalService.instance.updateLoggedin(false);
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

  public LoginToken(token: string, username: string, droit: number): Promise<boolean> {
    this.url = environment.maseance + 'maseance/login.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "login_token",
      username: username,
      token: token,
      droit: droit
    };

    return this.global.POST(this.url, body)
    .then((response: retour_login) => {
      GlobalService.is_logged_in = true;        
      GlobalService.instance.updateCompte(response.compte);
      GlobalService.instance.updateOtherProject(response.projets)
      if(response.selected_projet){
        GlobalService.instance.updateProjet(response.selected_projet);
        if (response.selected_projet.adherent) {
          GlobalService.instance.updateMenuType("ADHERENT");
          GlobalService.instance.updateSelectedMenuStatus("MENU");
        }
        if (response.selected_projet.prof) {
          GlobalService.instance.updateMenuType("PROF");
          GlobalService.instance.updateSelectedMenuStatus("MENU");
        }
        if (response.selected_projet.admin) {
          GlobalService.instance.updateMenuType("ADMIN");
          GlobalService.instance.updateSelectedMenuStatus("MENU");
        }
        return true;
      } else {
        return false;
      }
    })
    .catch(error => {
        GlobalService.instance.updateLoggedin(false);
        // Gestion de l'erreur
        return Promise.reject(error);
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
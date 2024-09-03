import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { GlobalService } from './global.services';
import { compte } from 'src/class/compte';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
  }
  public Login(username: string, password: string): Promise<any[]> {
    this.url = environment.maseance + 'maseance/login.php';
    //  this.url = this.url + "login.php";
    const body = {
      username: username,
      password: password
    };

    return this.global.POST(this.url, body)
      .then((response: retour_login) => {
        GlobalService.is_logged_in = true;
        let ct = new compte();
        ct.login = username;
        ct.id = response.user_id;
        ct.actif = response.actif;
        GlobalService.instance.updateCompte(ct);
        return response.project;
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
        let ct = new compte();
        ct.login = username;
        ct.id = response.user_id;
        ct.actif = response.actif;
        GlobalService.instance.updateCompte(ct);

        let pr: any = response.project;

        if (pr.adherent) {
          GlobalService.instance.updateMenuType("ADHERENT");
          GlobalService.instance.updateSelectedMenuStatus("MENU");
          GlobalService.instance.updateProjet(new projet(pr));
        }
        if (pr.prof) {
          GlobalService.instance.updateMenuType("PROF");
          GlobalService.instance.updateSelectedMenuStatus("MENU");
          GlobalService.instance.updateProjet(new projet(pr));
        }
        if (pr.admin) {
          GlobalService.instance.updateMenuType("ADMIN");
          GlobalService.instance.updateSelectedMenuStatus("MENU");
          GlobalService.instance.updateProjet(new projet(pr));
        }

        return true;
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
}
export class retour_login {
  public compte:compte;
  public projets:project_login[];
  public selected_projet:project_login;
}
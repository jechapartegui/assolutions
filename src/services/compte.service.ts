import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from 'src/environments/environment.prod';
import { compte } from 'src/class/compte';
import { projet } from 'src/class/projet';

@Injectable({
  providedIn: 'root'
})
export class CompteService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
  }

  public GetAll(): Promise<compte[]> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/compte_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "get_all"
    };

    return this.global.POST(this.url, body)
      .then((response: compte[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

  public getAccount(id: number): Promise<compte> {
    this.url = environment.maseance + 'maseance/compte_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "get_account",
      id: id
    };
    return this.global.POST(this.url, body)
      .then((response) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  public UpdateMail_Active(id: number, mail_active: number): Promise<any> {
    this.url = environment.maseance + 'maseance/compte_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "update_mail_active",
      compte: id,
      mail_active: mail_active
    };
    return this.global.POST(this.url, body)
      .then((response) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }
  public UpdateMail(compte: number, mail: string, password: string): Promise<boolean> {
    this.url = environment.maseance + "maseance/compte_manage.php";
    const body = {
      command: "update_mail",
      compte: compte,
      mail: mail,
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
  public AddOrMAJLogin(login: string, id: number): Promise<number> {
    this.url = environment.maseance + "maseance/compte_manage.php";
    const body = {
      command: "add_or_maj_login",
      login: login,
      id: id
    };

    return this.global.POST(this.url, body)
      .then((response: number) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  public CheckReinit(login: string, token: string):Promise<boolean> {
    this.url = environment.maseance + 'maseance/compte_manage.php';
    //  this.url = this.url + "login.php";
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
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public ValidReinit(login: string, token: string):Promise<boolean>  {
    this.url = environment.maseance + 'maseance/compte_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "valid_reinit_sans_mdp",
      login: login,
      token: token
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
  public ValidReinitMDP(login: string, token: string, password:string):Promise<boolean> {
    this.url = environment.maseance + 'maseance/compte_manage.php';
    //  this.url = this.url + "login.php";
    let body = {
      command: "valid_reinit_mdp",
      login: login,
      token: token,
      password:password
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


  ActiverCompte(id: number): Promise<boolean> {
    this.url = environment.maseance + 'maseance/compte_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "activate_account",
      id: id,
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





  public CheckLogin(login: string, psw: string): Promise<compte> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/compte_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "check",
      login: login,
      psw: psw
    };

    return this.global.POST(this.url, body)
      .then((response: compte) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Creer(compte: compte): Promise<number> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/compte_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "add",
      compte: compte
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
  public Exist(login: string): Promise<boolean> {
    this.url = environment.maseance + 'maseance/compte_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "exist",
      login: login,
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
  public ExistListe(list_login: string[]): Promise<string[]> {
    this.url = environment.maseance + 'maseance/compte_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "exist",
      list_login: list_login,
    };

    return this.global.POST(this.url, body)
      .then((response: string[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

  public Attacher(compte_id: number, rider_id: number): Promise<boolean> {
    this.url = environment.maseance + 'maseance/compte_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "attacher",
      compte_id: compte_id,
      rider_id: rider_id,
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
  public Detacher(rider_id: number): Promise<boolean> {
    return this.Attacher(0, rider_id);
  }
  public UpdateMailRelance(compte_id: number): Promise<boolean> {
    this.url = environment.maseance + 'maseance/compte_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "update_mail_relance",
      compte_id: compte_id,
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

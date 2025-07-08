import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from '../environments/environment.preprod';
import { Compte_VM } from '@shared/src/lib/compte.interface';

@Injectable({
  providedIn: 'root'
})
export class CompteService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
  }

  public GetAll(): Promise<Compte_VM[]> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
   this.url = 'api/compte/getall';
    //  this.url = this.url + "login.php";
   

    return this.global.GET(this.url)
      .then((response: Compte_VM[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

  public getAccount(id: number): Promise<Compte_VM> {
    this.url = 'api/compte/get/'  + id;
    //  this.url = this.url + "login.php";
   

    return this.global.GET(this.url)
      .then((response) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }
  public getAccountLogin(login: string): Promise<Compte_VM> {
     this.url = 'api/compte/get_login/'  + login;
    //  this.url = this.url + "login.php";
   

    return this.global.GET(this.url)
      .then((response) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  public UpdateMail_Active(id: number, mail_active: number): Promise<any> {
     this.url = 'api/compte/update_mail_active';
    //  this.url = this.url + "login.php";
    const body = {
      compte: id,
      mail_active: mail_active
    };
    return this.global.PUT(this.url, body)
      .then((response) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }
  public UpdateMail(compte: number, mail: string, password: string): Promise<boolean> {
     this.url = 'api/compte/update_mail';
    const body = {
      compte: compte,
      mail: mail,
      password: password
    };

    return this.global.PUT(this.url, body)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }
  public AddOrMAJLogin(login: string, id: number): Promise<number> {
     this.url = 'api/compte/add_or_maj_login';
    const body = {
      login: login,
      id: id
    };

    return this.global.PUT(this.url, body)
      .then((response: number) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }


  ActiverCompte(id: number): Promise<boolean> {
     this.url = 'api/compte/activate_account';

    return this.global.POST(this.url, id)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }





  public CheckLogin(login: string, psw: string): Promise<Compte_VM> {
     this.url = 'api/compte/activate_account';
    //  this.url = this.url + "login.php";
    const body = {
      command: "check",
      login: login,
      psw: psw
    };

    return this.global.POST(this.url, body)
      .then((response: Compte_VM) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

  public Add(compte: Compte_VM): Promise<number> {
     this.url = 'api/compte/add';

    return this.global.POST(this.url, compte)
      .then((response: number) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Exist(login: string): Promise<boolean> {
     this.url = 'api/compte/exist';

    return this.global.POST(this.url, login)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }


  public ExistListe(list_login: string[]): Promise<string[]> {
     this.url = 'api/compte/exists';

    return this.global.POST(this.url, list_login)
      .then((response: string[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

  public Attacher(compte_id: number, rider_id: number): Promise<boolean> {
     this.url = 'api/compte/attacher';

    const body = {
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

  public UpdateMDP(login:string, password: string): Promise<boolean> {
     this.url = 'api/compte/update_mdp';
    //  this.url = this.url + "login.php";
    const body = {
      login: login,
      password:password
    };

    return this.global.PUT(this.url, body)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }


}

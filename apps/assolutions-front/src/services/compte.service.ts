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
   this.url = 'api/auth/getall';
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
    this.url = 'api/auth/get/'  + id;
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
     this.url = 'api/auth/get_by_login/'  + login;
    //  this.url = this.url + "login.php";   

    return this.global.GET(this.url)
      .then((response) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  public checkLogin(login:string) : Promise<boolean> {
      this.url = 'api/auth/pre_login/'  + login;
    //  this.url = this.url + "login.php";   

    return this.global.GET(this.url)
      .then((response) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  public CheckToken(login:string, token:string) : Promise<boolean>{
     this.url = 'api/auth/check_token';
    const body = {
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
     this.url = 'api/auth/update_mdp';
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

  public Add(compte_vm:Compte_VM): Promise<number> {
    this.url = 'api/auth/add';
    return this.global.PUT(this.url,compte_vm)
      .then((response: number) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Update(compte_vm:Compte_VM, update_psw:boolean): Promise<boolean> {
    this.url = 'api/auth/update';
  const body = {
      compte_vm: compte_vm,
      update_psw:update_psw
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
  public Delete(id:number): Promise<boolean> {
    this.url = 'api/auth/delete/' + id;
  
    return this.global.DELETE(this.url)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }


}

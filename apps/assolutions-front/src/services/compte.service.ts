import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from '../environments/environment.prod';
import { Compte_VM } from '@shared/lib/compte.interface';

@Injectable({
  providedIn: 'root'
})
export class CompteService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
  }

  public GetAll(): Promise<Compte_VM[]> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
   this.url = environment.maseance + 'api/auth/getall';
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
    this.url = environment.maseance + 'api/auth/get/'  + id;
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
     this.url = environment.maseance + 'api/auth/get_by_login/'  + login.toLowerCase();
    //  this.url = this.url + "login.php";   

    return this.global.GET(this.url)
      .then((response) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  public ChangeMyPassword(newPassword: string | null): Promise<boolean> {
      this.url = environment.maseance + 'api/auth/change_my_password';
      //  this.url = this.url + "login.php";
      const body = {
        newPassword: newPassword
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

    public resetPasswordWithToken(login:string, token:string, newPassword: string | null): Promise<boolean> {
      this.url = environment.maseance + 'api/auth/reset_password_with_token';
      //  this.url = this.url + "login.php";
      const body = {
        login: login.toLowerCase(),
        token: token,
        newPassword: newPassword
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


  public checkLogin(login:string) : Promise<boolean> {
      this.url = environment.maseance + 'api/auth/pre_login/'  + login.toLowerCase();
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
     this.url = environment.maseance + 'api/auth/check_token';
    const body = {
      login: login.toLowerCase(),
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
     this.url = environment.maseance + 'api/compte/exists';

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
     this.url = environment.maseance + 'api/compte/attacher';

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
     this.url = environment.maseance + 'api/auth/update_mdp';
    //  this.url = this.url + "login.php";
    const body = {
      login: login.toLowerCase(),
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
    compte_vm.email = compte_vm.email.toLowerCase();
    this.url = environment.maseance + 'api/auth/add';
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
    compte_vm.email = compte_vm.email.toLowerCase();
    this.url = environment.maseance + 'api/auth/update';
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
    this.url = environment.maseance + 'api/auth/delete/';
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

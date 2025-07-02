import { Injectable } from '@angular/core';
import {  projet } from '../class/projet';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { KeyValuePair } from '@shared/src/lib/autres.interface';
import { LieuVM } from '@shared/src/lib/lieu.interface';
import { Groupe_VM, SaisonVM } from '@shared/src';

@Injectable({
  providedIn: 'root'
})
export class ProjetService {


  constructor(public global: GlobalService) {
  }
  url = environment.maseance;
  public Get(id: number): Promise<projet> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/projet_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "get",
      id: id
    };

    return this.global.POST(this.url, body)
      .then((response: projet) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public GetActiveSaison(): Promise<number> {
      this.url = 'api/project/active_saison/';
  
    return this.global.GET(this.url)
        .then((response: number) => {
  
          return response;
        })
        .catch(error => {
          // Gestion de l'erreur
          return Promise.reject(error);
        });
    }
  
  public GetAll(): Promise<projet[]> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/projet_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "get_all"
    };

    return this.global.POST(this.url, body)
      .then((response: projet[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public GetAllLight(): Promise<KeyValuePair[]> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/projet_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "get_all_light"
    };

    return this.global.POST(this.url, body)
      .then((response: KeyValuePair[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

  public SauvegarderTemplate(template: string, subject:string, type_mail:string): Promise<boolean> {
    this.url = environment.maseance + 'maseance/projet_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "save_template",
      template: template,
      subject:subject,
      type_mail: type_mail
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


  public Create(projet: projet, compte: number): Promise<number> {
    this.url = environment.maseance + 'maseance/projet_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "create",
      projet: projet,
      compte_id: compte
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



  public Add(projet: projet, groupes: Groupe_VM[], saisons: SaisonVM[], compte_id: number, ll: LieuVM[]): Promise<number> {
    this.url = environment.maseance + 'maseance/projet_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "add",
      projet: projet,
      groupes: groupes,
      saisons: saisons,
      lieu: ll,
      compte_id: compte_id,
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
  public Activate(token: string): Promise<boolean> {
    this.url = environment.maseance + 'maseance/projet_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "activate",
      token: token,
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
  public Update(projet: projet): Promise<boolean> {
    this.url = environment.maseance + 'maseance/projet_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "update",
      projet: projet,
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
  public UpdateInfo(projet: projet): Promise<boolean> {
    this.url = environment.maseance + 'maseance/projet_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "update_info",
      projet: projet,
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
  public UpdateParam(projet: projet): Promise<boolean> {
    this.url = environment.maseance + 'maseance/projet_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "update_param",
      projet: projet,
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
  public Delete(id: number): Promise<boolean> {
    this.url = environment.maseance + 'maseance/projet_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "delete",
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
}
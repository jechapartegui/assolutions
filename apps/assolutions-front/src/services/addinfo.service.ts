import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from 'src/environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class AddInfoService {
  url = environment.maseance;
  constructor(public global: GlobalService) {}

  public GetLV(name: string, original:boolean=false): Promise<string> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/addinfo_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: 'get_lv',
      name: name,
      original:original
    };

    return this.global
      .POST(this.url, body)
      .then((response: string) => {
        return response;
      })
      .catch((error) => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public UpdateLV(name: string, content:string): Promise<boolean> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = environment.maseance + 'maseance/addinfo_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: 'update_lv',
      name: name,
      content:content
    };

    return this.global
      .POST(this.url, body)
      .then((response: boolean) => {
        return response;
      })
      .catch((error) => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

  public GetObjet():Promise<{id:number, type:string,value:string }[]>{
    this.url = environment.maseance + 'maseance/addinfo_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: 'all_objets'
    };

    return this.global
      .POST(this.url, body)
      .then((response: {id:number, type:string,value:string }[]) => {
        return response;
      })
      .catch((error) => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

}

import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from '../environments/environment.prod';
import { AdherentImport } from '../app/import-adherent/import-adherent.component';
import { adherent } from '@shared/compte/src/lib/member.interface';
import { compte } from '@shared/compte/src/lib/compte.interface';
import { ItemList, KeyValuePair } from '@shared/compte/src';

@Injectable({
  providedIn: 'root'
})
export class AdherentService {

  constructor(public global: GlobalService) {
  }
  url = environment.maseance;
  public Get(id: number): Promise<adherent> {
     this.url = 'api/member/get/' + id;

  return this.global.GET(this.url)
      .then((response: adherent) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Add(adherent: adherent): Promise<number> {
   this.url = 'api/member/add';

  return this.global.PUT(this.url, adherent)
      .then((response: number) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

  public Delete(id: number): Promise<boolean> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url =  'api/member/delete/' + id;
    //  this.url = this.url + "login.php";

    return this.global.DELETE(this.url)
      .then((response: boolean) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Update(adherent: adherent): Promise<boolean> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
    this.url = 'api/member/update';
    //  this.url = this.url + "login.php";
   

    return this.global.PUT(this.url, adherent)
      .then((response: boolean) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  



  public GetAll(saison_id:number): Promise<adherent[]> {
this.url = `api/member/getall/${saison_id}`;

  return this.global.GET(this.url)
      .then((response: adherent[]) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

  public GetAllLight(saison_id:number):Promise<ItemList[]>{
this.url = `api/member/getall_light/${saison_id}`;

  return this.global.GET(this.url)
      .then((response: ItemList[]) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

  

  
  public GetAdherentAdhesion(saison_id:number): Promise<adherent[]> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
       this.url = 'api/member/getall_adherent/' + saison_id;

  return this.global.GET(this.url)
      .then((response: adherent[]) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
    public GetAdherentAdhesionLight(saison_id:number): Promise<KeyValuePair[]> {
    // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
       this.url = 'api/member/getall_adherent_light/' + saison_id;

  return this.global.GET(this.url)
      .then((response: KeyValuePair[]) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Essayer(essai:adherent, seance_id:number, project_id:number, _compte:compte): Promise<number> {
    this.url = 'api/member/essayer/'
    //  this.url = this.url + "login.php";
    const body = {
      command: "try",
      seance_id:seance_id,
      essai:essai,
      project_id:project_id

    };

    return this.global.POST(this.url, body)
      .then((response: number) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }


  public Check(prenom:string, nom:string, login:string): Promise<number> {
    this.url = environment.maseance + 'maseance/adherents_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "check",
      prenom:prenom,
      nom:nom,
      login:login

    };

    return this.global.POST(this.url, body)
      .then((response: number) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  public SimulerImport(liste:adherent[]): Promise<AdherentImport[]> {
    this.url = environment.maseance + 'maseance/adherents_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "simuler_import",
      liste:liste

    };

    return this.global.POST(this.url, body)
      .then((response: AdherentImport[]) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }
}

import { Injectable } from '@angular/core';
import { GlobalService } from './global.services';
import { environment } from '../environments/environment.prod';
import { AddInfo_VM } from '@shared/lib/addinfo.interface';
import { GenericLink_VM } from '@shared/index';
import { LieuNestService } from './lieu.nest.service';
import { AdherentService } from './adherent.service';
import { ProfesseurService } from './professeur.service';
import { CompteBancaireService } from './compte-bancaire.service';
import { AppStore } from '../app/app.store';

@Injectable({ providedIn: 'root' })
export class AddInfoService {
  url = environment.maseance;
constructor(private global: GlobalService,private store:AppStore,private  lieu_serv:LieuNestService,private  adherent_serv:AdherentService, 
    private  profserv:ProfesseurService, private comptebancaireserv:CompteBancaireService) {}






/** Récupérer un addinfo par id */
public get(id: number): Promise<AddInfo_VM> {
this.url = environment.maseance + `api/admin/addinfo/get/${id}`;
   return this.global.GET(this.url)
      .then((response: AddInfo_VM) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
}
public async getall_liste(ad: string[]): Promise<GenericLink_VM[]> {
  const list: GenericLink_VM[] = [];

  if (ad.includes('lieu')) {
    const lieux = await this.lieu_serv.GetAllLight();
    list.push(
      ...lieux.map(x => ({
        type: 'lieu',
        id: x.key,
        value: x.value,
      } as GenericLink_VM))
    );
  }

  if (ad.includes('rider')) {
    const riders = await this.adherent_serv.GetAdherentAdhesion(this.store.saison_active().id);
    list.push(
      ...riders.map(x => ({
        type: 'rider',
        id: x.id,
        value: `${x.prenom} ${x.nom}`,
      } as GenericLink_VM))
    );
  }
  if (ad.includes('prof')) {
    const profs = await this.profserv.GetProf();
    list.push(
      ...profs.map(x => ({
        type: 'prof',
        id: x.person.id,
        value: `${x.person.prenom} ${x.person.nom}`,
      } as GenericLink_VM))
    );
  }
  if (ad.includes('prof')) {
    const cbs = await this.comptebancaireserv.getAll();
    list.push(
      ...cbs.map(x => ({
        type: 'compte',
        id: x.id,
        value: `${x.nom}`,
      } as GenericLink_VM))
    );
  }
  return list;
}

/** Récupérer un addinfo par id */
public get_lv(nom:string, force:boolean): Promise<AddInfo_VM> {
this.url = environment.maseance + `api/admin/addinfo/list/${nom}/${force}`;	
   return this.global.GET(this.url)
      .then((response: AddInfo_VM) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
}

public update_lv(payload: Partial<AddInfo_VM> & { id: number }): Promise<boolean> {
  this.url = environment.maseance + 'api/admin/addinfo/update_lv';
    //  this.url = this.url + "login.php";
   

    return this.global.PUT(this.url, payload)
      .then((response: boolean) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
}


/** Créer une entrée addinfo */
public add(payload: Partial<AddInfo_VM>): Promise<number> {
this.url = environment.maseance + 'api/admin/addinfo/add';
    //  this.url = this.url + "login.php";
   

    return this.global.PUT(this.url, payload)
      .then((response: number) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
}


/** Mettre à jour une entrée addinfo */
public update(payload: Partial<AddInfo_VM> & { id: number }): Promise<boolean> {
 this.url = environment.maseance + 'api/admin/addinfo/update';
    //  this.url = this.url + "login.php";
   

    return this.global.PUT(this.url, payload)
      .then((response: boolean) => {

        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
}


/** Supprimer */
public delete(id: number): Promise<boolean> {
   this.url = environment.maseance + 'api/groupe/deletelien';
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

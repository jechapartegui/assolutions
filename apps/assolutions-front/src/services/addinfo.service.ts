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
private base = environment.maseance + 'api/admin/addinfo';
constructor(private http: GlobalService,private  lieu_serv:LieuNestService,private  adherent_serv:AdherentService, private store:AppStore,
    private  profserv:ProfesseurService, private comptebancaireserv:CompteBancaireService) {}


/** Liste de valeurs (LV) pour un object_type donné */
public list(objectType: string, original = false): Promise<AddInfo_VM> {
const url = `${this.base}/list/${encodeURIComponent(objectType)}?original=${original}`;
return this.http.GET(url);
}



/** Récupérer un addinfo par id */
public get(id: number): Promise<AddInfo_VM> {
const url = `${this.base}/get/${id}`;
return this.http.GET(url);
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
public get_lv(nom:string,force:boolean): Promise<AddInfo_VM> {
const url = `${this.base}/get/${nom}/${force}`;
return this.http.GET(url);
}

public update_lv(payload: Partial<AddInfo_VM> & { id: number }): Promise<boolean> {
const url = `${this.base}/update`;
return this.http.PUT(url, payload);
}


/** Créer une entrée addinfo */
public add(payload: Partial<AddInfo_VM>): Promise<number> {
const url = `${this.base}/add`;
return this.http.PUT(url, payload);
}


/** Mettre à jour une entrée addinfo */
public update(payload: Partial<AddInfo_VM> & { id: number }): Promise<boolean> {
const url = `${this.base}/update`;
return this.http.PUT(url, payload);
}


/** Supprimer */
public delete(id: number): Promise<boolean> {
const url = `${this.base}/delete/${id}`;
return this.http.DELETE(url);
}
}

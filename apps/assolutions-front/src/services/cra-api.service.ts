import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';

export interface CraLine { id:number; date:string; type:string; libelle:string; quantite:number|string; taux:number|string; montant:number|string; seance_professeur_id?:number|null; }
export interface CraView { id:number; annee:number; mois:number; statut:string; montant_total:number|string; lignes:CraLine[]; facture?:any; }
export interface CraMonth { annee:number; mois:number; statut:string; cra_id:number|null; }
export interface CraContext {
  saison:{id:number;nom:string;date_debut:string;date_fin:string};
  professeur_ids:number[];
  months:CraMonth[];
}

@Injectable({providedIn:'root'})
export class CraApiService {
  constructor(private readonly api:ApiClientService){}
  context(){return this.api.GET<CraContext>('/cra/me/context');}
  openMine(annee:number,mois:number){return this.api.POST<CraView>('/cra/me/open',{annee,mois});}
  get(id:number){return this.api.GET<CraView>(`/cra/${id}`);}
  addLine(id:number,line:{date:string;type:string;libelle:string;quantite:number;taux:number}){return this.api.POST<CraView>(`/cra/${id}/lines`,line);}
  removeLine(id:number,lineId:number){return this.api.POST<CraView>(`/cra/${id}/lines/${lineId}/delete`,{});}
  validate(id:number){return this.api.POST<CraView>(`/cra/${id}/validate`,{});}
}

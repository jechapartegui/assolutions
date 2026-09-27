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
  updateLine(id:number,lineId:number,quantite:number,taux:number){return this.api.POST<CraView>(`/cra/${id}/lines/${lineId}`,{quantite,taux});}
  sessions(id:number){return this.api.GET<any[]>(`/cra/${id}/sessions`);}
  addSession(id:number,seance_id:number,quantite:number,taux:number){return this.api.POST<CraView>(`/cra/${id}/sessions`,{seance_id,quantite,taux});}
  removeLine(id:number,lineId:number){return this.api.POST<CraView>(`/cra/${id}/lines/${lineId}/delete`,{});}
  noInvoice(id:number){return this.api.POST<any>('/cra/'+id+'/no-invoice',{});}
  invoice(id:number,dto:{document_id:number;numero?:string|null;date_facture:string}){return this.api.POST<any>(`/cra/${id}/invoice`,dto);}
  validate(id:number){return this.api.POST<CraView>(`/cra/${id}/validate`,{});}
}

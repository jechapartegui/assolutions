import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';

export interface CraLine { id:number; date:string; type:string; libelle:string; quantite:number|string; taux:number|string; montant:number|string; seance_professeur_id?:number|null; }
export interface CraView { id:number; annee:number; mois:number; statut:string; montant_total:number|string; lignes:CraLine[]; facture?:any; }

@Injectable({providedIn:'root'})
export class CraApiService {
  constructor(private readonly api:ApiClientService){}
  open(contrat_prof_id:number,annee:number,mois:number){return this.api.POST<CraView>('/cra/open',{contrat_prof_id,annee,mois});}
  get(id:number){return this.api.GET<CraView>(`/cra/${id}`);}
  addLine(id:number,line:{date:string;type:string;libelle:string;quantite:number;taux:number}){return this.api.POST<CraView>(`/cra/${id}/lines`,line);}
  removeLine(id:number,lineId:number){return this.api.POST<CraView>(`/cra/${id}/lines/${lineId}/delete`,{});}
  validate(id:number){return this.api.POST<CraView>(`/cra/${id}/validate`,{});}
}

import { Component, OnInit } from '@angular/core';
import { ApiClientService } from '../../services/api-client.service';
@Component({selector:'app-cra-admin',templateUrl:'./cra-admin.component.html',styleUrls:['./cra-admin.component.css'],standalone:false})
export class CraAdminComponent implements OnInit {
  rows:any[]=[]; selected:any=null; loading=true; saving=false; reviewComment='';
  constructor(private api:ApiClientService){}
  async ngOnInit(){await this.reload();}
  async reload(){this.loading=true;try{this.rows=await this.api.GET<any[]>('/cra/admin/list');}finally{this.loading=false;}}
  async open(row:any){this.selected=await this.api.GET<any>(`/cra/admin/${row.id}`);this.reviewComment=this.selected?.commentaire_club||'';}
  async validate(){if(!this.selected||this.saving)return;this.saving=true;try{this.selected=await this.api.POST<any>(`/cra/admin/${this.selected.id}/validate`,{commentaire:this.reviewComment});await this.reload();}finally{this.saving=false;}}
  async returnForCorrection(){if(!this.selected||this.saving||!confirm('Renvoyer ce CRA au professeur pour correction ?'))return;this.saving=true;try{this.selected=await this.api.POST<any>(`/cra/admin/${this.selected.id}/return`,{commentaire:this.reviewComment});await this.reload();}finally{this.saving=false;}}
  money(v:any){return Number(v||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});}
  status(s:string){return s==='SOUMIS'?'À valider':s==='VALIDE_CLUB'?'Validé club':s==='FACTURE'?'Facturé':s==='BROUILLON'?'Brouillon':s;}
}

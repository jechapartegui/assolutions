import { Component } from '@angular/core';
import { CraApiService, CraView } from '../../services/cra-api.service';

@Component({selector:'app-cra',templateUrl:'./cra.component.html',styleUrls:['./cra.component.css'],standalone:false})
export class CraComponent {
  contratId:number|null=null; year=new Date().getFullYear(); month=new Date().getMonth()+1; cra:CraView|null=null; loading=false;
  line={date:new Date().toISOString().slice(0,10),type:'PRESTATION',libelle:'',quantite:1,taux:0};
  constructor(private readonly api:CraApiService){}
  async open(){if(!this.contratId)return;this.loading=true;try{this.cra=await this.api.open(this.contratId,this.year,this.month);}finally{this.loading=false;}}
  async add(){if(!this.cra||!this.line.libelle.trim())return;this.cra=await this.api.addLine(this.cra.id,{...this.line});this.line.libelle='';this.line.quantite=1;}
  async remove(id:number){if(!this.cra)return;this.cra=await this.api.removeLine(this.cra.id,id);}
  async validate(){if(!this.cra||!confirm('Valider ce CRA ? Il ne sera plus modifiable.'))return;this.cra=await this.api.validate(this.cra.id);}
  money(v:any){return Number(v||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});}
}

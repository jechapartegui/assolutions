import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CraApiService, CraContext, CraMonth, CraView } from '../../services/cra-api.service';
import { ErrorService } from '../../services/error.service';

@Component({selector:'app-cra',templateUrl:'./cra.component.html',styleUrls:['./cra.component.css'],standalone:false})
export class CraComponent {
  context:CraContext|null=null;
  selected:CraMonth|null=null;
  cra:CraView|null=null;
  loading=true;
  loadingCra=false;
  saving=false;
  line={date:'',type:'PRESTATION',libelle:'',quantite:1,taux:0};

  constructor(private readonly api:CraApiService,private readonly router:Router){}

  async ngOnInit(){
    try{
      this.context=await this.api.context();
      if(this.context.months.length) await this.selectMonth(this.context.months[0]);
    }catch(error:any){
      ErrorService.instance.emitChange(ErrorService.instance.CreateError('Charger mes CRA',error?.message??error));
    }finally{this.loading=false;}
  }

  async selectMonth(month:CraMonth){
    if(this.loadingCra)return;
    this.selected=month;this.loadingCra=true;
    try{
      this.cra=await this.api.openMine(month.annee,month.mois);
      month.statut=this.cra.statut;month.cra_id=this.cra.id;
      this.resetLine();
    }catch(error:any){
      ErrorService.instance.emitChange(ErrorService.instance.CreateError('Charger le CRA',error?.message??error));
    }finally{this.loadingCra=false;}
  }

  async add(){
    if(!this.cra||!this.line.libelle.trim()||this.saving)return;
    if(this.line.quantite<=0||this.line.taux<0)return;
    this.saving=true;
    try{
      this.cra=await this.api.addLine(this.cra.id,{...this.line});
      this.syncStatus();this.resetLine();
    }finally{this.saving=false;}
  }

  async remove(id:number){
    if(!this.cra||this.saving)return;
    this.saving=true;
    try{this.cra=await this.api.removeLine(this.cra.id,id);this.syncStatus();}
    finally{this.saving=false;}
  }

  async validate(){
    if(!this.cra||this.saving||!confirm('Valider définitivement ce CRA ? Après validation, les lignes ne seront plus modifiables.'))return;
    this.saving=true;
    try{
      this.cra=await this.api.validate(this.cra.id);this.syncStatus();
      ErrorService.instance.emitChange(ErrorService.instance.OKMessage('CRA validé'));
    }finally{this.saving=false;}
  }

  back(){this.router.navigate(['/mon-compte']);}
  money(v:any){return Number(v||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});}
  qty(v:any){return Number(v||0).toLocaleString('fr-FR',{maximumFractionDigits:2});}
  monthLabel(m:CraMonth){return new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(new Date(m.annee,m.mois-1,1));}
  statusLabel(s:string){return s==='A_SAISIR'?'À saisir':s==='BROUILLON'?'Brouillon':s==='VALIDE'?'Validé':s==='FACTURE'?'Facturé':s;}
  statusClass(s:string){return s==='VALIDE'||s==='FACTURE'?'is-success':s==='BROUILLON'?'is-warning':'is-light';}
  isEditable(){return this.cra?.statut==='BROUILLON';}
  get periodMin(){return this.selected?`${this.selected.annee}-${String(this.selected.mois).padStart(2,'0')}-01`:'';}
  get periodMax(){
    if(!this.selected)return '';
    const d=new Date(this.selected.annee,this.selected.mois,0);
    const today=new Date();
    const end=d>today?today:d;
    return `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
  }

  private resetLine(){this.line={date:this.periodMax,type:'PRESTATION',libelle:'',quantite:1,taux:0};}
  private syncStatus(){if(this.selected&&this.cra){this.selected.statut=this.cra.statut;this.selected.cra_id=this.cra.id;}}
}

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CraApiService, CraContext, CraMonth, CraView } from '../../services/cra-api.service';
import { ErrorService } from '../../services/error.service';
import { DossierPersonneApiService } from '../../services/dossier-personne-api.service';

@Component({selector:'app-cra',templateUrl:'./cra.component.html',styleUrls:['./cra.component.css'],standalone:false})
export class CraComponent {
  context:CraContext|null=null;
  selected:CraMonth|null=null;
  cra:CraView|null=null;
  loading=true;
  loadingCra=false;
  saving=false;
  line={date:'',type:'PRESTATION',libelle:'',quantite:1,taux:0};
  sessions:any[]=[]; selectedSessionId:number|null=null; sessionQty=1; sessionRate=0;
  invoiceFile:File|null=null; invoiceNumber=''; invoiceDate=new Date().toISOString().slice(0,10);

  constructor(private readonly api:CraApiService,private readonly router:Router,private readonly dossierApi:DossierPersonneApiService){}

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
      this.sessions=await this.api.sessions(this.cra.id);
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

  async saveLine(line:any){
    if(!this.cra||this.saving)return;this.saving=true;
    try{this.cra=await this.api.updateLine(this.cra.id,line.id,Number(line.quantite),Number(line.taux));this.syncStatus();}
    finally{this.saving=false;}
  }

  async addSession(){
    if(!this.cra||!this.selectedSessionId||this.saving)return;this.saving=true;
    try{
      this.cra=await this.api.addSession(this.cra.id,this.selectedSessionId,Number(this.sessionQty),Number(this.sessionRate));
      this.sessions=await this.api.sessions(this.cra.id);this.selectedSessionId=null;this.syncStatus();
    }finally{this.saving=false;}
  }

  async remove(id:number){
    if(!this.cra||this.saving)return;
    this.saving=true;
    try{this.cra=await this.api.removeLine(this.cra.id,id);this.syncStatus();}
    finally{this.saving=false;}
  }

  chooseInvoice(event:Event){this.invoiceFile=(event.target as HTMLInputElement).files?.[0]??null;}
  async depositInvoice(){
    if(!this.cra||!this.context||!this.invoiceFile||this.saving)return;
    if(this.invoiceFile.size>10*1024*1024){ErrorService.instance.emitChange(ErrorService.instance.CreateError('Déposer la facture','Le fichier dépasse 10 Mo'));return;}
    this.saving=true;
    try{
      const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(new Error('Lecture impossible'));r.onload=()=>resolve(String(r.result??''));r.readAsDataURL(this.invoiceFile!);});
      const doc=await this.dossierApi.saveDocument({personne_id:this.context.professeur_ids[0],typedoc:'Facture',titre:this.invoiceFile.name,mimetype:this.invoiceFile.type||'application/pdf',data_base64:data,date_document:this.invoiceDate});
      await this.api.invoice(this.cra.id,{document_id:doc.id,numero:this.invoiceNumber||null,date_facture:this.invoiceDate});
      this.cra=await this.api.get(this.cra.id);this.syncStatus();
      ErrorService.instance.emitChange(ErrorService.instance.OKMessage('Facture déposée et flux financier créé'));
    }finally{this.saving=false;}
  }

  async confirmWithoutInvoice(){
    if(!this.cra||this.saving||!confirm('Confirmer sans facture ? Le montant validé sera transmis à la gestion financière du club.'))return;
    this.saving=true;
    try{await this.api.noInvoice(this.cra.id);this.cra=await this.api.get(this.cra.id);this.syncStatus();ErrorService.instance.emitChange(ErrorService.instance.OKMessage('CRA transmis pour paiement sans facture'));}
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
  statusLabel(s:string){return s==='A_SAISIR'?'À saisir':s==='BROUILLON'?'Brouillon':s==='SOUMIS'?'En attente du club':s==='VALIDE_CLUB'?'Validé par le club':s==='FACTURE'?'Facturé':s;}
  statusClass(s:string){return s==='VALIDE_CLUB'||s==='FACTURE'?'is-success':s==='SOUMIS'?'is-info':s==='BROUILLON'?'is-warning':'is-light';}
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

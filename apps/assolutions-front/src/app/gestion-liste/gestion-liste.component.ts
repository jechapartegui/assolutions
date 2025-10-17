import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ClassComptable, StaticClass, TypeStock, TypeTransaction } from '../global';
import { HttpErrorResponse } from '@angular/common/http';
import { AddInfoService } from '../../services/addinfo.service';
import { ErrorService } from '../../services/error.service';
import { AddInfo_VM } from '@shared/index';

 // 1) Déclare le catalogue en const pour dériver le type automatiquement
const LV_OPTIONS = {
  class_compta: $localize`Classe comptable`,
  stock:        $localize`Type de stock`,
  type_achat:   $localize`Type d'achat`,
} as const;

// 2) Type dérivé des clés
type LVKey = keyof typeof LV_OPTIONS;

@Component({
  standalone: false,
  selector: 'app-gestion-liste',
  templateUrl: './gestion-liste.component.html',
  styleUrls: ['./gestion-liste.component.css'],
})
export class GestionListeComponent implements OnInit {
  charge = false;
  action = '';

  // 3) La valeur sélectionnée + le map label
  public lv: LVKey = 'class_compta';
  public ListeValue: Record<LVKey, string> = LV_OPTIONS;

  // 4) Une liste de clés pour le *ngFor du <select>
  public lvKeys: LVKey[] = Object.keys(LV_OPTIONS) as LVKey[];
  public histo:string = "";
   @ViewChild('scrollableContent', { static: false })
      scrollableContent!: ElementRef;
      showScrollToTop: boolean = false;

  constructor(public SC: StaticClass, public addinfo_serv: AddInfoService) {}

  get lvLabel(): string {
    return this.ListeValue[this.lv];
  }

  ngOnInit(): void {
    
    this.Load(true);
  }

  // Appelée quand on change la sélection OU au démarrage
  Load(force: boolean) {
    const errorService = ErrorService.instance;
    if(this.histo.length > 1){ 
      console.log("ici");
      let h:string = "";
      switch (this.lv) {
          case 'class_compta':
            h =  JSON.stringify(this.SC.ClassComptable);
            break;
          case 'stock':
             h =  JSON.stringify(this.SC.TypeStock);
            break;
          case 'type_achat':
             h =  JSON.stringify(this.SC.TypeTransaction);
            break;
        }
      if(this.histo !== h){
         let c = window.confirm($localize`Des modifications ont été détectées ? En revenant en arrière, vous perdez les modifications non sauvegardées ?`);
         if(c){
              this.addinfo_serv
      .get_lv(this.lv, force)
      .then((ret: AddInfo_VM) => {
        this.histo = ret.text;
        switch (this.lv) {
          case 'class_compta':
            this.SC.ClassComptable = JSON.parse(ret.text);
            break;
          case 'stock':
            this.SC.TypeStock = JSON.parse(ret.text);
            break;
          case 'type_achat':
            this.SC.TypeTransaction = JSON.parse(ret.text);
            break;
        }
        this.charge = true;
      })
      .catch((err: HttpErrorResponse) => {
        const o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        switch (this.lv) {
          case 'class_compta':
            this.SC.ClassComptable = [];
            break;
          case 'stock':
            this.SC.TypeStock = [];
            break;
          case 'type_achat':
            this.SC.TypeTransaction = [];
            break;
        }
      });
         } else {
          return;
         }
      }
    } else {
      console.log("là", this.lv)
    this.addinfo_serv
      .get_lv(this.lv, force)
      .then((ret: AddInfo_VM) => {
        this.histo = ret.text;
        switch (this.lv) {
          case 'class_compta':
            this.SC.ClassComptable = JSON.parse(ret.text);
            break;
          case 'stock':
            this.SC.TypeStock = JSON.parse(ret.text);
            break;
          case 'type_achat':
            this.SC.TypeTransaction = JSON.parse(ret.text);
            break;
        }
        this.charge = true;
      })
      .catch((err: HttpErrorResponse) => {
        const o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        switch (this.lv) {
          case 'class_compta':
            this.SC.ClassComptable = [];
            break;
          case 'stock':
            this.SC.TypeStock = [];
            break;
          case 'type_achat':
            this.SC.TypeTransaction = [];
            break;
        }
      });
    }

  }

      private waitForScrollableContainer(): void {
      setTimeout(() => {
        if (this.scrollableContent) {
          this.scrollableContent.nativeElement.addEventListener(
            'scroll',
            this.onContentScroll.bind(this)
          );
        } else {
          this.waitForScrollableContainer(); // Re-tente de le trouver
        }
      }, 100); // Réessaie toutes les 100 ms
    }
  
    onContentScroll(): void {
      const scrollTop = this.scrollableContent.nativeElement.scrollTop || 0;
      this.showScrollToTop = scrollTop > 200;
    }
  
    scrollToTop(): void {
      this.scrollableContent.nativeElement.scrollTo({
        top: 0,
        behavior: 'smooth', // Défilement fluide
      });
    }

  Sauvegarder() {
    this.action = $localize`Sauvegarder`;
    const errorService = ErrorService.instance;
    let content = '';
    switch (this.lv) {
      case 'class_compta':
        content = JSON.stringify(this.SC.ClassComptable);
        break;
        case 'stock':
          content = JSON.stringify(this.SC.TypeStock);
          break;
        case 'type_achat':
          content = JSON.stringify(this.SC.TypeTransaction);
          break;
    }
    if(content === this.histo){

        let o = errorService.Create(this.action,  $localize`Pas de modification`,  "Warning");
        errorService.emitChange(o);
        return;
    }
    let adin:AddInfo_VM = new AddInfo_VM();
    adin.id = 0 // va falloir alors chercher ca
    adin.object_id = 0;
    adin.value_type = ""
    adin.text = content;
    adin.object_type = this.lv;
    this.addinfo_serv
      .update(adin)
      .then((ret: boolean) => {
        this.histo =content;
        let o = errorService.OKMessage(this.action);
        if(!ret){
           o = errorService.UnknownError(this.action);          
        }
        errorService.emitChange(o);
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });

  }

  ExporterExcel(){}

  Ajouter(){
    if(this.lv == 'class_compta'){
      this.AjouterCC();
    } else if(this.lv == "stock"){
      this.AjouterTS();
    } else if(this.lv == "type_achat"){
      this.AjouterTA();
    }
  }

  Supprimer(obj:any){
      if(this.lv == 'class_compta'){
      this.SupprimerCC(obj);
    } else if(this.lv == "stock"){
      this.SupprimerTS(obj);
    } else if(this.lv == "type_achat"){
      this.SupprimerTA(obj);
    }
  }

  AjouterCC() {
    let cc: ClassComptable = {
      numero: 0,
      libelle: 'Nouveau',
    };
    this.SC.ClassComptable.push(cc);
  }
  SupprimerCC(cc: ClassComptable) {
    this.SC.ClassComptable = this.SC.ClassComptable.filter(
      (x) => x.libelle !== cc.libelle && x.numero !== cc.numero
    );
  }
  AjouterTS() {
    let id = Math.max(...this.SC.TypeStock.map(x => x.id),0)
    console.log(id);
    let cc: TypeStock = new TypeStock();
    cc.id = id + 1;
    this.SC.TypeStock.push(cc);
  }
  SupprimerTS(cc: TypeStock) {
    this.SC.TypeStock = this.SC.TypeStock.filter(
      (x) => x.id !== cc.id
    );
  }
  AjouterTA() {
    let cc: { class_compta: number; libelle: string } = {
      class_compta: 0,
      libelle: 'Nouveau',
    };
    this.SC.TypeTransaction.push(cc);
  }
  SupprimerTA(cc: { class_compta: number; libelle: string }) {
    this.SC.TypeTransaction = this.SC.TypeTransaction.filter(
      (x) => x.libelle !== cc.libelle && x.class_compta !== cc.class_compta
    );
  }

  Reinit(){
    this.action = $localize`Réinitialiser`;
    this.Load(true);
  }
  Charger(){
    this.action = $localize`Charger`;
    this.Load(false);
  }
}

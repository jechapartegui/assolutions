import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CategorieStock, ClassComptable, StaticClass, TypeStock, TypeTransaction } from '../global';
import { HttpErrorResponse } from '@angular/common/http';
import { AddInfoService } from '../../services/addinfo.service';
import { ErrorService } from '../../services/error.service';
import { AddInfo_VM } from '@shared/index';

 // 1) Déclare le catalogue en const pour dériver le type automatiquement
export const LV_OPTIONS = {
  class_compta: $localize`Classe comptable`,
  stock:        $localize`Type de stock`,
  type_achat:   $localize`Type d'achat`,
  categorie_stock:   $localize`Catégorie de stock`,
} as const;

// 2) Type dérivé des clés
export type LVKey = keyof typeof LV_OPTIONS;

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
  public histo_ts:string = "";
  public histo_cs:string = "";
  public histo_ta:string = "";
  public histo_cc:string = "";
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
          this.addinfo_serv.ChargerLV(force).then(()=>{
            this.histo_cc = JSON.stringify(this.SC.ClassComptable);
            this.histo_ts = JSON.stringify(this.SC.TypeStock);
            this.histo_ta = JSON.stringify(this.SC.TypeTransaction);
            this.histo_cs = JSON.stringify(this.SC.CategorieStock);
            this.charge = true;
    })
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
    let h_cc = JSON.stringify(this.SC.ClassComptable);
    let h_cs = JSON.stringify(this.SC.CategorieStock);
    let h_ta = JSON.stringify(this.SC.TypeTransaction);
    let h_ts = JSON.stringify(this.SC.TypeStock);
    if(h_cc !== this.histo_cc){
       let adin:AddInfo_VM = new AddInfo_VM();
    adin.id = 0 // va falloir alors chercher ca
    adin.object_id = 0;
    adin.value_type = ""
    adin.text = h_cc;
    adin.project_id = null;
    adin.object_type = "class_compta";
      this.addinfo_serv.update_lv(adin) .then((ret: boolean) => {
        this.histo_cc = h_cc;
        if(!ret){
        let o = errorService.UnknownError(this.action);  
        errorService.emitChange(o);        
        }
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });

    }
    if(h_cs !== this.histo_cs){
       let adin:AddInfo_VM = new AddInfo_VM();
    adin.id = 0 // va falloir alors chercher ca
    adin.object_id = 0;
    adin.value_type = ""
    adin.text = h_cs;
    adin.project_id = null;
    adin.object_type = "categorie_stock";
      this.addinfo_serv.update_lv(adin) .then((ret: boolean) => {
        this.histo_cs = h_cs;
        if(!ret){
        let o = errorService.UnknownError(this.action);  
        errorService.emitChange(o);        
        }
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });

    }
 if(h_ta !== this.histo_ta){
       let adin:AddInfo_VM = new AddInfo_VM();
    adin.id = 0 // va falloir alors chercher ca
    adin.object_id = 0;
    adin.value_type = ""
    adin.text = h_ta;
    adin.project_id = null;
    adin.object_type = "type_achat";
      this.addinfo_serv.update_lv(adin) .then((ret: boolean) => {
        this.histo_ta = h_ta
        if(!ret){
        let o = errorService.UnknownError(this.action);  
        errorService.emitChange(o);        
        }
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });

    }
    if(h_ts !== this.histo_ts){
       let adin:AddInfo_VM = new AddInfo_VM();
    adin.id = 0 // va falloir alors chercher ca
    adin.object_id = 0;
    adin.value_type = ""
    adin.project_id = null;
    adin.object_type = "stock";
      this.addinfo_serv.update_lv(adin) .then((ret: boolean) => {
        this.histo_ts = h_ts;
        if(!ret){
        let o = errorService.UnknownError(this.action);  
        errorService.emitChange(o);        
        }
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });

    }
  }

  ExporterExcel(){}

  Ajouter(){
    if(this.lv == 'class_compta'){
      this.AjouterCC();
    } else if(this.lv == "stock"){
      this.AjouterTS();
    } else if(this.lv == "type_achat"){
      this.AjouterTA();
    } else if(this.lv == "categorie_stock"){
      this.AjouterCS();
    }
  }

  Supprimer(obj:any){
      if(this.lv == 'class_compta'){
      this.SupprimerCC(obj);
    } else if(this.lv == "stock"){
      this.SupprimerTS(obj);
    } else if(this.lv == "type_achat"){
      this.SupprimerTA(obj);
    } else if(this.lv == "categorie_stock"){
      this.SupprimerCS(obj);
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
    AjouterCS() {
    let cc: CategorieStock = {
      categorie: 'Nouvelle catégorie',
    };
    this.SC.CategorieStock.push(cc);
  }
   SupprimerCS(cc: CategorieStock) {
    this.SC.CategorieStock = this.SC.CategorieStock.filter(
      (x) => x.categorie !== cc.categorie 
    );
  }
  AjouterTS() {
    let cc: TypeStock = new TypeStock();
    this.SC.TypeStock.push(cc);
  }
  SupprimerTS(cc: TypeStock) {
    this.SC.TypeStock = this.SC.TypeStock.filter(
      (x) => x.categorie !== cc.categorie && x.libelle !== cc.libelle
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

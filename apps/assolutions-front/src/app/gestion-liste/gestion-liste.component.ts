import { Component } from '@angular/core';
import { ClassComptable, StaticClass, TypeStock, TypeTransaction } from '../global';
import { HttpErrorResponse } from '@angular/common/http';
import { AddInfoService } from '../../services/addinfo.service';
import { ErrorService } from '../../services/error.service';
import { AddInfo_VM } from '@shared/index';

@Component({
  standalone: false,
  selector: 'app-gestion-liste',
  templateUrl: './gestion-liste.component.html',
  styleUrls: ['./gestion-liste.component.css'],
})
export class GestionListeComponent {
  lv: string;
  charge: boolean = false;
  action: string = '';
  public ClassComptable: ClassComptable[] = [];
  public TypeStock: TypeStock[] = [];
  public TypeTransaction: TypeTransaction[] = [];
  constructor(public SC: StaticClass, public addinfo_serv: AddInfoService) {}
  Load(force:boolean) {
    const errorService = ErrorService.instance;
    this.addinfo_serv
      .get_lv(this.lv, force)
      .then((ret: AddInfo_VM) => {
        switch (this.lv) {
          case 'class_compta':
            this.ClassComptable = JSON.parse(ret.text);
            break;
          case 'stock':
            this.TypeStock = JSON.parse(ret.text);
            break;
          case 'type_achat':
            this.TypeTransaction = JSON.parse(ret.text);
            break;
        }
        this.charge = true;
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        switch (this.lv) {
          case 'class_compta':
            this.ClassComptable = [];
            break;
          case 'stock':
            this.TypeStock = [];
            break;
          case 'type_achat':
            this.TypeTransaction =  [];
            break;
        }
      });
  }
  Sauvegarder() {
    let content = '';
    switch (this.lv) {
      case 'class_compta':
        content = JSON.stringify(this.ClassComptable);
        break;
        case 'stock':
          content = JSON.stringify(this.TypeStock);
          break;
        case 'type_achat':
          content = JSON.stringify(this.TypeTransaction);
          break;
    }
    let adin:AddInfo_VM = new AddInfo_VM();
    adin.id = 0 // va falloir alors chercher ca
    adin.object_id = 0;
    adin.value_type = ""
    adin.text = content;
    adin.object_type = this.lv;
    this.action = $localize`Sauvegarder`;
    const errorService = ErrorService.instance;
    this.addinfo_serv
      .update(adin)
      .then((ret: boolean) => {
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
  AjouterCC() {
    let cc: ClassComptable = {
      numero: "0",
      libelle: 'Nouveau',
    };
    this.ClassComptable.push(cc);
  }
  SupprimerCC(cc: ClassComptable) {
    this.ClassComptable = this.ClassComptable.filter(
      (x) => x.libelle !== cc.libelle && x.numero !== cc.numero
    );
  }
  AjouterTS() {
    let id = Math.max(...this.TypeStock.map(x => x.id),0)
    console.log(id);
    let cc: TypeStock = new TypeStock();
    cc.id = id + 1;
    this.TypeStock.push(cc);
  }
  SupprimerTS(cc: TypeStock) {
    this.TypeStock = this.TypeStock.filter(
      (x) => x.id !== cc.id
    );
  }
  AjouterTA() {
    let cc: { class_compta: number; libelle: string } = {
      class_compta: 0,
      libelle: 'Nouveau',
    };
    this.TypeTransaction.push(cc);
  }
  SupprimerTA(cc: { class_compta: number; libelle: string }) {
    this.TypeTransaction = this.TypeTransaction.filter(
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

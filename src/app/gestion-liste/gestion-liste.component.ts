import { Component } from '@angular/core';
import { StaticClass } from '../global';
import { AddInfoService } from 'src/services/addinfo.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorService } from 'src/services/error.service';

@Component({
  selector: 'app-gestion-liste',
  templateUrl: './gestion-liste.component.html',
  styleUrls: ['./gestion-liste.component.css'],
})
export class GestionListeComponent {
  lv: string;
  charge: boolean = false;
  action: string = '';
  public ClassComptable: { numero: number; libelle: string }[] = [];
  public TypeStock: { categorie: string; libelle: string }[] = [];
  public TypeTransaction: { class_compta: number; libelle: string }[] = [];
  constructor(public SC: StaticClass, public addinfo_serv: AddInfoService) {}
  Load(force:boolean) {
    const errorService = ErrorService.instance;
    this.addinfo_serv
      .GetLV(this.lv, force)
      .then((ret: string) => {
        switch (this.lv) {
          case 'class_compta':
            this.ClassComptable = JSON.parse(ret);
            break;
          case 'stock':
            this.TypeStock = JSON.parse(ret);
            break;
          case 'type_achat':
            this.TypeTransaction = JSON.parse(ret);
            break;
        }
        this.charge = true;
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
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
    this.action = $localize`Sauvegarder`;
    const errorService = ErrorService.instance;
    this.addinfo_serv
      .UpdateLV(this.lv, content)
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
    let cc: { numero: number; libelle: string } = {
      numero: 0,
      libelle: 'Nouveau',
    };
    this.ClassComptable.push(cc);
  }
  SupprimerCC(cc: { numero: number; libelle: string }) {
    this.ClassComptable = this.ClassComptable.filter(
      (x) => x.libelle !== cc.libelle && x.numero !== cc.numero
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

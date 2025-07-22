import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ErrorService } from '../../services/error.service';
import { GlobalService } from '../../services/global.services';
import { LieuNestService } from '../../services/lieu.nest.service';
import { Lieu_VM } from '@shared/src/lib/lieu.interface';
import { Adresse } from '@shared/src/lib/adresse.interface';

@Component({
  selector: 'app-lieu',
  templateUrl: './lieu.component.html',
  styleUrls: ['./lieu.component.css']
})
export class LieuComponent implements OnInit {
  valid_address: boolean;
  editLieu: Lieu_VM;
  editMode: boolean = false;
  action: string = "";
  liste_lieu: Lieu_VM[] = [];
  sort_nom: string;
  constructor(public router: Router, public lieu_serv: LieuNestService) { }

  ngOnInit(): void {
    if (GlobalService.is_logged_in) {

      if ((GlobalService.menu === "APPLI")) {
        this.router.navigate(['/menu']);
        return;
      }
      this.UpdateListeLieu();
      // Chargez la liste des cours
      
    }
  }

  UpdateListeLieu(){
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les lieux`;
    this.lieu_serv.GetAll().then((lieu) => {
      this.liste_lieu = lieu;
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
      return;
    })
  }

  onValidAdresseChange(isValid: boolean) {
    this.valid_address = isValid;
  }
  onAdresseChange(data: Adresse) {
    this.editLieu.adresse = data;
  }
  Creer(): void {
    this.editLieu = new Lieu_VM();
    this.editMode = true;
  }

  Refresh(){
    const errorService = ErrorService.instance;
    this.action = $localize`Rafraichir le lieu`;
    this.lieu_serv.Get(this.editLieu.id).then((c)=>{
      this.editLieu = c;
      let o = errorService.OKMessage(this.action);
      errorService.emitChange(o);
     }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      })
  }

  Save(lieu: Lieu_VM) {
    const errorService = ErrorService.instance;
    this.action = $localize`Ajouter un lieu`;
    if (lieu) {
      if (lieu.id == 0) {

        this.lieu_serv.Add(lieu).then((id) => {
          if (id > 0) {
            this.editLieu.id = id;
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.UpdateListeLieu();
          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
          }

        }).catch((err) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
      }
      else {
        this.lieu_serv.Update(lieu).then((ok) => {

          this.action = $localize`Mettre à jour un lieu`;
          if (ok) {


            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.UpdateListeLieu();
          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
          }

        }).catch((err) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
      }
    }
  }
  Retour(): void {

    let confirm = window.confirm($localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`);
    if (confirm) {
      this.editMode = false;
      this.editLieu = null;
      this.UpdateListeLieu();
    }
  }



  Sort(sens: "NO" | "ASC" | "DESC", champ: string) {
    switch (champ) {
      case "nom":
        this.sort_nom = sens;      
        this.liste_lieu.sort((a, b) => {
          const nomA = a.nom.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.nom.toUpperCase();
          let comparaison = 0;
          if (nomA > nomB) {
            comparaison = 1;
          } else if (nomA < nomB) {
            comparaison = -1;
          }

          return this.sort_nom === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;

    }


  }
  Edit(lieu: Lieu_VM): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la séance`;
    this.lieu_serv.Get(lieu.id).then((ss) => {
      this.editLieu =ss;
      this.editMode = true;
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    })
  }
  Delete(lieu: Lieu_VM): void {
    const errorService = ErrorService.instance;

    let confirmation = window.confirm($localize`Voulez-vous supprimer ce lieu ? Cela risque d'affecté le chargement des séances/cours dans ce lieu ?. `);
    if (confirmation) {
      this.action = $localize`Supprimer un lieu`;
      if (lieu) {
        this.lieu_serv.Delete(lieu.id).then((result) => {
          if (result) {           
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
          }
        }).catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        })
      }
    }
  }
}
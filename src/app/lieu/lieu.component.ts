import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Adresse } from 'src/class/address';
import { lieu, Lieu } from 'src/class/lieu';
import { ErrorService } from 'src/services/error.service';
import { GlobalService } from 'src/services/global.services';
import { LieuService } from 'src/services/lieu.service';

@Component({
  selector: 'app-lieu',
  templateUrl: './lieu.component.html',
  styleUrls: ['./lieu.component.css']
})
export class LieuComponent implements OnInit {
  valid_address: boolean;
  editLieu: Lieu;
  editMode: boolean = false;
  action: string = "";
  liste_lieu: Lieu[] = [];
  sort_nom: string;
  constructor(public router: Router, public lieu_serv: LieuService) { }

  ngOnInit(): void {
    if (GlobalService.is_logged_in) {

      if ((GlobalService.menu === "ADHERENT") || (GlobalService.menu === "PROF")) {
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
      this.liste_lieu = lieu.map(x => new Lieu(x));
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
    this.editLieu.Adresse = data;
    this.editLieu.datasource.adresse = JSON.stringify(data);
  }
  Creer(): void {
    let c = new lieu();
    this.editLieu = new Lieu(c);
    this.editMode = true;
  }

  Refresh(){
    const errorService = ErrorService.instance;
    this.action = $localize`Rafraichir le lieu`;
    this.lieu_serv.Get(this.editLieu.ID).then((c)=>{
      this.editLieu = new Lieu(c);
      let o = errorService.OKMessage(this.action);
      errorService.emitChange(o);
     }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      })
  }

  Save(lieu: Lieu) {
    const errorService = ErrorService.instance;
    this.action = $localize`Ajouter un lieu`;
    if (lieu) {
      if (lieu.ID == 0) {

        this.lieu_serv.Add(lieu.datasource).then((id) => {
          if (id > 0) {
            this.editLieu.ID = id;
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.UpdateListeLieu();
          } else {
            let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
            errorService.emitChange(o);
          }

        }).catch((err) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
      }
      else {
        this.lieu_serv.Update(lieu.datasource).then((ok) => {

          this.action = $localize`Mettre à jour un lieu`;
          if (ok) {


            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.UpdateListeLieu();
          } else {
            let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
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
          const nomA = a.Nom.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.Nom.toUpperCase();
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
  Edit(lieu: Lieu): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la séance`;
    this.lieu_serv.Get(lieu.ID).then((ss) => {
      this.editLieu = new Lieu(ss);
      this.editMode = true;
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    })
  }
  Delete(lieu: Lieu): void {
    const errorService = ErrorService.instance;

    let confirmation = window.confirm($localize`Voulez-vous supprimer ce lieu ? Cela risque d'affecté le chargement des séances/cours dans ce lieu ?. `);
    if (confirmation) {
      this.action = $localize`Supprimer un lieu`;
      if (lieu) {
        this.lieu_serv.Delete(lieu.ID).then((result) => {
          if (result) {           
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
          } else {
            let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
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
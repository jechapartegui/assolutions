import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CompteBancaireService } from '../../services/compte-bancaire.service';
import { ErrorService } from '../../services/error.service';
import { CompteBancaire_VM } from '@shared/index';

@Component({
  standalone: false,
  selector: 'app-compte-bancaire',
  templateUrl: './compte-bancaire.component.html',
  styleUrls: ['./compte-bancaire.component.css']
})
export class CompteBancaireComponent implements OnInit {
  ListeCompte: CompteBancaire_VM[];
  editCB:CompteBancaire_VM;
  context :"LISTE" | "EDIT" = "LISTE";
  action: string;
  selected_compte: number;

  sort_nom: string;
  constructor(public cpt_serv: CompteBancaireService, public router:Router) {}

  ngOnInit(): void {
    this.UpdateListeCompte();
  }
  Save() {

    const errorService = ErrorService.instance;
    this.action = $localize`Ajouter un compte`;
    if(this.editCB.id == 0){
      this.cpt_serv
        .add(this.editCB)
        .then((liste) => {
          if (liste > 0) {
            this.editCB.id = liste;
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
          }
          this.UpdateListeCompte();
        })
        .catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
    } else {
      this.action = $localize`Editer un compte`;
      this.cpt_serv
      .update(this.editCB)
      .then((liste) => {
        if (liste) {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
        } else {
          let o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
        }
        this.UpdateListeCompte();
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
    }
  }

  Delete(cpt) {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer un compte`;
    this.cpt_serv
      .delete(cpt.id)
      .then((liste) => {
        if (liste) {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
        } else {
          let o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
        }
        this.UpdateListeCompte();
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }

  UpdateListeCompte() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les comptes`;
    this.cpt_serv
      .getAll()
      .then((liste) => {
        this.ListeCompte = liste;       
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }

  Sort(sens: 'NO' | 'ASC' | 'DESC', champ: string) {
    switch (champ) {
      case 'nom':
        this.sort_nom = sens;
        this.ListeCompte.sort((a, b) => {
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

  Creer(){
    this.editCB = new CompteBancaire_VM();
    this.context = "EDIT";
  }
  Edit(cb:CompteBancaire_VM){
    this.editCB = cb;
    this.context = "EDIT";
  }
  Retour(){
    let confirm = window.confirm($localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`);
    if (confirm) {
      this.context = "LISTE";
      this.editCB = null;
      this.UpdateListeCompte();
    }
  }
  Transactions(cb:CompteBancaire_VM){
  this.router.navigate(['/comptabilite'], { queryParams: { id: cb.id }} );
  }
}


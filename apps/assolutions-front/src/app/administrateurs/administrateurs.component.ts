import { Component, OnInit } from '@angular/core';
import { CompteService } from 'src/services/compte.service';
import { compte } from 'src/class/compte';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorService } from 'src/services/error.service';

@Component({
  selector: 'app-administrateurs',
  templateUrl: './administrateurs.component.html',
  styleUrls: ['./administrateurs.component.css'],
})
export class AdministrateursComponent implements OnInit {
  ListeCompte: compte[];
  CompteDispo: compte[];
  action: string;
  psw: string = '';
  selected_compte: number;

  sort_login: string;
  constructor(public cpt_serv: CompteService) {}

  ngOnInit(): void {
    this.UpdateListeCompte();
  }
  Ajouter() {
    const errorService = ErrorService.instance;
    this.action = $localize`Ajouter un compte`;
    this.cpt_serv
      .AddAdmin(this.selected_compte, this.psw)
      .then((liste) => {
        if (liste > 0) {
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

  Delete(cpt) {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer un compte`;
    this.cpt_serv
      .DeleteAdmin(cpt.id, this.psw)
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
      .GetAllAdmin()
      .then((liste) => {
        this.ListeCompte = liste;
        this.cpt_serv
          .GetAll()
          .then((ll) => {
            this.CompteDispo = ll;
            this.ListeCompte.forEach((cc) => {
              this.CompteDispo = this.CompteDispo.filter((x) => x.id !== cc.id);
            });
          })
          .catch((err: HttpErrorResponse) => {
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
          });
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }

  Sort(sens: 'NO' | 'ASC' | 'DESC', champ: string) {
    switch (champ) {
      case 'login':
        this.sort_login = sens;
        this.ListeCompte.sort((a, b) => {
          const nomA = a.login.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.login.toUpperCase();
          let comparaison = 0;
          if (nomA > nomB) {
            comparaison = 1;
          } else if (nomA < nomB) {
            comparaison = -1;
          }

          return this.sort_login === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
    }
  }
}

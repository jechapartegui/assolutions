import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { compte, Compte } from 'src/class/compte';
import { CompteService } from 'src/services/compte.service';
import { ErrorService } from 'src/services/error.service';

@Component({
  selector: 'app-compte-detail',
  templateUrl: './compte-detail.component.html',
  styleUrls: ['./compte-detail.component.css']
})
export class CompteDetailComponent implements OnInit {
  @Input() context: "VIEW" | "VIEWSTATE" | "ADD" | "EDIT" | "EDIT_ADMIN" = "VIEW";
  @Input() login: string;
  @Input() compte_id: number;
  action: string = "";
  thisCompte: compte;
  valid_login = false;
  //view : juste le libellé
  //viewstate : libellé + type de MDP et situation du compte
  // viewstate + possibilité d'éditer
  //admin : possible de tout faire
  //editing : changement de mdp
  //editing complet : changer mdp, renvoyer mail, débloquer compte

  constructor(public compte_serv: CompteService) { }

  ngOnInit(): void {
    this.Load();
  }
  Load() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger le profil`;
    switch (this.context) {
      case 'VIEW':
        if (!this.login) {
          if (!this.compte_id) {
            this.login = $localize`Erreur`;
          } else {
            this.compte_serv.getAccount(this.compte_id).then((compte: Compte) => {
              this.login = compte.Login;
              let o = errorService.OKMessage(this.action);
              errorService.emitChange(o);
            }).catch((err: HttpErrorResponse) => {
              let o = errorService.CreateError(this.action, err.message);
              errorService.emitChange(o);
              this.login = $localize`Erreur`;
            })
          }
        }
        break;
      case 'VIEWSTATE':
        if (!this.compte_id) {
          this.login = $localize`Erreur`;
        } else {
          this.compte_serv.getAccount(this.compte_id).then((compte: compte) => {
            this.login = compte.login;
            this.thisCompte = compte;
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
          }).catch((err: HttpErrorResponse) => {
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
            this.login = $localize`Erreur`;
          })
        }
        break;
      case "ADD":
        this.thisCompte = new compte();
        this.valid_login = false;
        break;
      default:
        break;
    }


  }
  Valid(){
    const errorService = ErrorService.instance;
    this.action = $localize`Validation du Login`;
    this.compte_serv.Exist(this.thisCompte.login).then((boo) =>{
      this.valid_login = boo;
      if(boo){
        let o = errorService.CreateError(this.action,$localize`Login déjà utilisé`);
        errorService.emitChange(o);

      } else {
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      }
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    })
  }
  IsEmail(text): boolean {
    var re = /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;
    return re.test(text);
  }
}

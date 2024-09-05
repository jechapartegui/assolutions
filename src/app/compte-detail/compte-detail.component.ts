import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { compte, Compte } from 'src/class/compte';
import { CompteService } from 'src/services/compte.service';
import { ErrorService } from 'src/services/error.service';
import { GlobalService } from 'src/services/global.services';
import { code_alert } from '../global';

@Component({
  selector: 'app-compte-detail',
  templateUrl: './compte-detail.component.html',
  styleUrls: ['./compte-detail.component.css']
})
export class CompteDetailComponent implements OnInit {
  @Input() login: string;
  @Input() compte_id: number;
  login_valide: string;
  action: string = "";
  thisCompte: compte;
  valid_login = false;
  rattache: boolean;
  //view : juste le libellé
  //viewstate : libellé + type de MDP et situation du compte
  // viewstate + possibilité d'éditer
  //admin : possible de tout faire
  //editing : changement de mdp
  //editing complet : changer mdp, renvoyer mail, débloquer compte

  constructor(public compte_serv: CompteService, public GlobalService: GlobalService) { }

  ngOnInit(): void {
    this.Load();
  }
  Load() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger le profil`;
    console.log(this.compte_id);
    if (this.compte_id && this.compte_id > 0) {
      this.compte_serv.getAccount(this.compte_id).then((compte: compte) => {
        this.thisCompte = compte;
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.login = $localize`Erreur`;
      })


    } else {

      this.thisCompte = new compte();

    }
  }
Valid(){
  const errorService = ErrorService.instance;
  this.action = $localize`Validation du Login`;
  this.compte_serv.Exist(this.thisCompte.login).then((boo) => {
    this.valid_login = boo;
    if (boo) {
      let o = errorService.OKMessage(this.action +  $localize` : Login déjà utilisé`);
      errorService.emitChange(o);
      this.login_valide = this.thisCompte.login;
      this.rattache = true;
    } else {
      this.rattache = false;
      this.login_valide = this.thisCompte.login;
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
CreerLogin(){

}
RattacherLogin(){ }
}

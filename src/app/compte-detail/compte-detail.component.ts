import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { compte, Compte } from 'src/class/compte';
import { CompteService } from 'src/services/compte.service';
import { ErrorService } from 'src/services/error.service';
import { GlobalService } from 'src/services/global.services';
import { code_alert } from '../global';
import { LoginService } from 'src/services/login.service';

@Component({
  selector: 'app-compte-detail',
  templateUrl: './compte-detail.component.html',
  styleUrls: ['./compte-detail.component.css']
})
export class CompteDetailComponent implements OnInit {
  @Input() login: string;
  @Input() compte_id: number;
  @Output() changeRattacher = new EventEmitter<string>();
  @Output() demRattachement = new EventEmitter<string>();
  
  login_valide: string;
  action: string = "";
  thisCompte: compte;
  valid_login = false;
  baseUrl:string;

  context : "RATTACHER_MDP" | "RATTACHER_TOKEN" | "RATTACHER" | "VUE" | "CREER_MDP" | "DEFINIR_MDP";

  constructor(public compte_serv: CompteService, public login_serv: LoginService, public GlobalService: GlobalService) { 
    this.baseUrl = `${window.location.protocol}//${window.location.hostname}`;}

  ngOnInit(): void {
    this.Load();
  }
  Load() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger le profil`;
    if (this.compte_id && this.compte_id > 0) {
      this.compte_serv.getAccount(this.compte_id).then((compte: compte) => {
        this.thisCompte = compte;
        this.context = "VUE";
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.login = $localize`Erreur`;
        this.context = "RATTACHER";
      })


    } else {
      this.context = "RATTACHER";
      this.thisCompte = new compte();

    }
  }
  CopierToken(){
    const errorService = ErrorService.instance;
    this.action = $localize`Copier le token`;
    this.compte_serv.getToken(this.thisCompte.id, 1).then((token) =>{
      let url = this.baseUrl + "/login?username=" + this.thisCompte.login + "&token_connexion=" + token + "&droit=1;";
      navigator.clipboard.writeText(url).then(() => {
        alert($localize`Texte copié dans le presse-papier !`);
      }).catch(err => {
        alert($localize`Échec de la copie du texte : ` + err);
      });
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    })
    return;
     
  }

  Valid() {
    const errorService = ErrorService.instance;
    this.action = $localize`Validation du Login`;
    this.compte_serv.Exist(this.thisCompte.login).then((boo) => {
      this.valid_login = boo;
      if (boo) {
        let o = errorService.OKMessage(this.action + $localize` : Login déjà utilisé`);
        errorService.emitChange(o);
        this.login_valide = this.thisCompte.login;
        this.compte_serv.getAccountLogin(this.login_valide).then((compte: compte) => {
          this.login = compte.login;
          this.thisCompte = compte;
          if(this.thisCompte.est_password){
            this.context = "RATTACHER_MDP";
          } else {
            this.context = "RATTACHER_TOKEN";
          }
        }).catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        })
      } else {
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
  RenvoiToken() {
    this.action = $localize`Renvoi des liens de connexion directe`;
    const errorService = ErrorService.instance;
    this.login_serv.RenvoiToken(this.thisCompte.login).then(ok => {
      if (ok) {

        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      } else {

        let o = errorService.UnknownError(this.action);
        errorService.emitChange(o);
      }

    }).catch((error: Error) => {
      let o = errorService.CreateError(this.action, error.message);
      errorService.emitChange(o);
    });
  }

  Rattacher(){
    this.context = "VUE";
    this.changeRattacher.emit(this.login_valide);
  }
  DemanderRattachement(){
    this.context = "VUE";
    this.demRattachement.emit(this.login_valide);
  }

}

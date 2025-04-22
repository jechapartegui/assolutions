import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CompteService } from 'src/services/compte.service';
import { ErrorService } from 'src/services/error.service';
import { LoginService } from 'src/services/login.service';

@Component({
  selector: 'app-reinit-mdp',
  templateUrl: './reinit-mdp.component.html',
  styleUrls: ['./reinit-mdp.component.css']
})
export class ReinitMdpComponent implements OnInit {
  @Input() Login: string;
  @Input() Token: string;
  @Input() context :"REINIT" | "DEFINE" | "CONFIRM" | "CREER" = "REINIT";
  @Output() demanderRattachement = new EventEmitter();
  @Output() CreerMDP = new EventEmitter<string[]>();
  @Output() rattacher = new EventEmitter();
  Password: string = "";
  action = "";
  ConfirmPassword: string = "";
  constructor(public compte_serv: CompteService, public login_serv: LoginService, public route: ActivatedRoute, public router: Router) { }


  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la page de réinitialisation de mot de passe`;
    this.route.queryParams.subscribe(params => {
      if ('login' in params) {
        this.Login = params['login'];
        if ('token' in params) {
          this.Token = params['token'];
        } else{
          let o = errorService.CreateError(this.action, $localize`Absence de token`);
          errorService.emitChange(o);
          this.router.navigate(['/login']);
        }
      } else {
        if (!this.Login) {
          this.router.navigate(['/login']);
          let o = errorService.CreateError(this.action, $localize`Absence de login`);
          errorService.emitChange(o);
        } else if (this.Token != "Gulfed2606") {
          let o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
        }
      }
    })
  }

  Valid(password: string): boolean {
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z0-9!@#$%^&*(),.?":{}|<>]{8,}$/;

    return passwordRegex.test(password);
  }
  Confirm(password: string): boolean {
    if (password == this.Password) {
      return true;
    } else {
      return false;
    }
  }

  ValiderModificationMDP() {
    const errorService = ErrorService.instance;
    this.action = $localize`Réinitialisation de mot de passe`;
    this.compte_serv.ValidReinitMDP(this.Login, this.Token, this.Password).then((retour) => {
      if (retour) {
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
        this.router.navigate(['/login']);
      } else {
        let o = errorService.UnknownError(this.action);
        errorService.emitChange(o);
      }
    }).catch((error: Error) => {
      let o = errorService.CreateError(this.action, error.message);
      errorService.emitChange(o);
    });
  }
  RenvoiToken() {
    const errorService = ErrorService.instance;
    this.action = $localize`Renvoi des clés token`;
    this.compte_serv.ValidReinit(this.Login, this.Token).then((retour) => {
      if (retour) {
        this.login_serv.RenvoiToken(this.Login).then((ok) => {
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
      } else {
        let o = errorService.UnknownError(this.action);
        errorService.emitChange(o);
      }
    }).catch((error: Error) => {
      let o = errorService.CreateError(this.action, error.message);
      errorService.emitChange(o);
    });
  }

  DefinirMDP(){
    const errorService = ErrorService.instance;
    this.action = $localize`Définition du mot de passe`;
    if(this.context == 'CREER'){
      let param = [];
      param.push(this.Login);
      param.push(this.Password);
      this.CreerMDP.emit(param);
    } else {
      this.compte_serv.UpdateMDP(this.Login, this.Password).then((retour) => {
        if (retour) {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
          this.router.navigate(['/menu']);
        } else {
          let o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
        }
      }).catch((error: Error) => {
        let o = errorService.CreateError(this.action, error.message);
        errorService.emitChange(o);
      });
    }
    
  }
  ConfirmMDP(){
    const errorService = ErrorService.instance;
    this.action = $localize`Rattachement par mot de passe`;
    this.compte_serv.CheckLogin(this.Login, this.Password).then((cpt) =>{
      if(cpt){
        this.rattacher.emit();
      }
    }).catch((error: Error) => {
      let o = errorService.CreateError(this.action, error.message);
      errorService.emitChange(o);
    });
  }
  DemanderRattachement(){
    this.demanderRattachement.emit();
  }
}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Compte, compte } from 'src/class/compte';
import { environment } from 'src/environments/environment.prod';
import { CompteService } from 'src/services/compte.service';
import { ErrorService } from 'src/services/error.service';
import { GlobalService } from 'src/services/global.services';
import { LoginService, project_login } from 'src/services/login.service';
import { MailService } from 'src/services/mail.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  Source: Compte = new Compte(new compte());
  action: string;
  projets: project_login[];
  projets_select: project_login = null;
  loading: boolean;
  profil: "ADHERENT" | "PROF" | "ADMIN" = null;
  psw_projet: string = null;



  constructor(private login_serv: LoginService, private compte_serv: CompteService, private mail_serv: MailService, private router: Router, private route: ActivatedRoute) {
    this.Source.Login = environment.defaultlogin;
    this.Source.Password = environment.defaultpassword;
  }

  ngOnInit(): void {
    let token: string;
    let user: string;
    let droit: number;
    const errorService = ErrorService.instance;
    this.route.queryParams.subscribe(params => {
      if ('test_mail' in params) {
        this.action = $localize`test envoi mail`;
        this.mail_serv.Test().then((ret => {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
        }))
      }
      if ('reinit_mdp' in params) {
        this.action = $localize`Lien de réinitialisation du mot de passe`;
        token = params['reinit_mdp'];
        user = params['login'];
        this.compte_serv.CheckReinit(user, token).then(boo => {
          if (boo) {
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.router.navigate(['/reinit-mdp'], { queryParams: { login: user, token :token } });

          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
            this.loading = false;
          }

        }).catch((error: Error) => {
          let o = errorService.CreateError(this.action, error.message);
          errorService.emitChange(o);
          this.loading = false;
        });

      }

      this.action = $localize`Connexion par token`;
      if ('token_connexion' in params) {
        token = params['token_connexion'];
        if ('username' in params) {
          user = params['username'];
          if ('droit' in params) {
            this.loading = true;
            droit = params['droit'];
            this.login_serv.LoginToken(token, user, droit).then((retour) => {
              if (retour) {
                this.loading = false;
                this.router.navigate(['/menu']);
              } else {
                this.loading = false;
              }
            }).catch((error: Error) => {
              let o = errorService.CreateError(this.action, error.message);
              errorService.emitChange(o);
              this.loading = false;
            });
          }
        }
      }
    })
  }
  Login() {
    this.action = $localize`Se connecter`;
    this.loading = true;
    // Appel à la méthode Check_Login du service RidersService
    const errorService = ErrorService.instance;
    this.login_serv.Login(this.Source.Login, this.Source.Password).then(() => {
      this.projets = [];     
      if (!GlobalService.projet) {
        if (GlobalService.other_project.length == 0) {
          let o = errorService.CreateError(this.action, $localize`Aucun projet lié`);
          errorService.emitChange(o);
          this.loading = false;
        }
        if (GlobalService.other_project.length == 1) {
          this.projets.push(GlobalService.other_project[0]);
          this.projets_select = GlobalService.other_project[0];

        } else {
          GlobalService.other_project.forEach((pp) => {
            let curpro = this.projets.find(x => x.id == pp.id);
            if (curpro) {
              if (pp.adherent == true) {
                curpro.adherent = true;
              }
              if (pp.prof == true) {
                curpro.prof = true;
              }
              if (pp.admin == true) {
                curpro.admin = true;
              }
            } else {
              this.projets.push(pp);
            }
          })
        }
        this.loading = false;
      } else {
        this.router.navigate(['/menu']);
        this.loading = false;
      }
    }
    ).catch((error: Error) => {
      console.log(error.stack);
      let o = errorService.CreateError(this.action, error.message);
      errorService.emitChange(o);
      this.loading = false;
    });
  }
  LogOut() {
    this.action = $localize`Se déconnecter`;
    const errorService = ErrorService.instance;
    this.login_serv.Logout().then(ok => {
      if (ok) {

        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
        this.projets = null;
        this.router.navigate(['/login']);
      } else {

        let o = errorService.UnknownError(this.action);
        errorService.emitChange(o);
      }

    }).catch((error: Error) => {
      let o = errorService.CreateError(this.action, error.message);
      errorService.emitChange(o);
      this.loading = false;
    });
  }

  RenvoiToken() {
    this.action = $localize`Renvoi des liens de connexion directe`;
    const errorService = ErrorService.instance;
    this.login_serv.RenvoiToken(this.Source.Login).then(ok => {
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
      this.loading = false;
    });
  }
  ReinitMDP() {
    this.action = $localize`Réinitialiser le mot de passe`;
    const errorService = ErrorService.instance;
    this.login_serv.ReinitMDP(this.Source.Login).then(ok => {
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
      this.loading = false;
    });
  }

  SelectProject(event) {
    this.projets_select = this.projets.find(x => x.id == event);
  }

  ConnectToProject(charg: "ADHERENT" | "PROF" | "ADMIN" = "ADHERENT") {
    this.action = $localize`Se connecter au projet`;
    this.loading = true;
    // Appel à la méthode Check_Login du service RidersService
    const errorService = ErrorService.instance;

    if (this.projets_select) {
      GlobalService.instance.updateMenuType(charg);
      GlobalService.instance.updateSelectedMenuStatus("MENU");
      GlobalService.instance.updateProjet(this.projets_select);
      this.router.navigate(['/menu']);
      this.loading = false;
    } else {
      let o = errorService.CreateError(this.action, $localize`Pas de projet sélectionné`);
      errorService.emitChange(o);
      this.loading = false;
    }

  }
 
}

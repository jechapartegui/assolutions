import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Compte, compte } from 'src/class/compte';
import { liste_projet, projet } from 'src/class/projet';
import { environment } from 'src/environments/environment.prod';
import { CompteService } from 'src/services/compte.service';
import { ErrorService } from 'src/services/error.service';
import { GlobalService } from 'src/services/global.services';
import { MailService } from 'src/services/mail.service';
import { ProjetService } from 'src/services/projet.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  Source: Compte = new Compte(new compte());
  action: string;
  projets: liste_projet[];
  projets_select: liste_projet = null;
  loading: boolean;
  profil: "ADHERENT" | "PROF" | "ADMIN" = null;
  psw_projet: string = null;
  constructor(private compte_serv: CompteService, private mail_serv: MailService, private router: Router, private route: ActivatedRoute) {
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
        this.mail_serv.Test().then((ret=>{
          let o = errorService.OKMessage  (this.action);
          errorService.emitChange(o);
        }))
      }

      this.action = $localize`Connexion par token`;
      if ('token_connexion' in params) {
        token = params['token_connexion'];
        if ('username' in params) {
          user = params['username'];
          if ('droit' in params) {
            this.loading = true;
            droit = params['droit'];
            this.compte_serv.LoginToken(token, user, droit).then((retour) => {
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
    this.compte_serv.Login(this.Source.Login, this.Source.Password, true).then((pr) => {
      this.projets = [];
      pr.forEach((pp) => {
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

          if (pp.actif == true) {
            curpro.actif = true;
          }
        } else {
          this.projets.push(pp);
        }
      })
      if (pr.length == 0) {
        let o = errorService.CreateError(this.action, $localize`Aucun projet lié`);
        errorService.emitChange(o);
        this.loading = false;
      } else if (pr.length == 1) {
        let _pr: liste_projet = pr[0];
        this.projets_select = _pr;
        if (_pr.adherent && !_pr.prof && !_pr.admin) {
          this.ConnectToProject("ADHERENT");
        } else if (!_pr.adherent && _pr.prof && !_pr.admin) {
          this.ConnectToProject("PROF");
        } else if (!_pr.adherent && !_pr.prof && _pr.admin) {
          this.ConnectToProject("ADMIN");
        } else {
          this.loading = false;
        }
      }
      this.loading = false;
    }).catch((error: Error) => {
      let o = errorService.CreateError(this.action, error.message);
      errorService.emitChange(o);
      this.loading = false;
    });
  }
  LogOut() {
    this.action = $localize`Se déconnecter`;
    const errorService = ErrorService.instance;
    this.compte_serv.Logout().then(ok=>{
      if(ok){

        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
        this.projets = null;
        this.router.navigate(['/login']);
      } else {
        
        let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
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

    if (this.projets_select.actif) {
      GlobalService.instance.updateMenuType(charg);
      GlobalService.instance.updateSelectedMenuStatus("MENU");
      GlobalService.instance.updateProjet(new projet(this.projets_select))
      this.router.navigate(['/menu']);
      this.loading = false;
    } else {
      let o = errorService.CreateError(this.action, $localize`Projet inactif`);
      errorService.emitChange(o);
      this.loading = false;
    }

  }
  text(){
    window.confirm("aimes tu clémentine ?");
  }

}

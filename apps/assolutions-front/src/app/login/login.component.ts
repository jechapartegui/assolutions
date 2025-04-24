import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Login_VM } from '../../class/compte';
import { environment } from '../../environments/environment.prod';
import { CompteService } from '../../services/compte.service';
import { ErrorService } from '../../services/error.service';
import { GlobalService } from '../../services/global.services';
import { LoginNestService } from '../../services/login.nest.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  VM: Login_VM = new Login_VM();
  action: string;
  projets: {id:number, nom:string, prof:boolean, adherent:boolean, admin:boolean}[];
  projets_select: {id:number, nom:string, prof:boolean, adherent:boolean, admin:boolean} = null;
  loading: boolean;
  psw_projet: string = null;

  constructor(
    private login_serv_nest: LoginNestService,
    private compte_serv: CompteService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.VM.Login = environment.defaultlogin;
    this.VM.Password = environment.defaultpassword;
  }

  ngOnInit(): void {
    let token: string;
    let user: string;
    const errorService = ErrorService.instance;
    this.route.queryParams.subscribe((params) => {
      if ('reinit_mdp' in params) {
        this.action = $localize`Lien de réinitialisation du mot de passe`;
        token = params['reinit_mdp'];
        user = params['login'];
        this.compte_serv
          .CheckReinit(user, token)
          .then((boo) => {
            if (boo) {
              let o = errorService.OKMessage(this.action);
              errorService.emitChange(o);
              this.router.navigate(['/reinit-mdp'], {
                queryParams: { login: user, token: token },
              });
            } else {
              let o = errorService.UnknownError(this.action);
              errorService.emitChange(o);
              this.loading = false;
            }
          })
          .catch((error: Error) => {
            let o = errorService.CreateError(this.action, error.message);
            errorService.emitChange(o);
            this.loading = false;
          });
      }
    });
  }

  async PreLogin() {
    this.action = $localize`Se connecter`;
    const errorService = ErrorService.instance;
    this.login_serv_nest
      .PreLogin(this.VM.Login)
      .then((retour) => {
        if (retour) {
          this.VM.mdp_requis = true;
        } else {
          this.Login();
        }

        // Tu peux ensuite appeler une 2e méthode pour vérifier le mot de passe
        // Exemple : this.LoginEtape2(email, password)
      })
      .catch((error: string) => {
        let o = errorService.CreateError(this.action, error);
        errorService.emitChange(o);
      });
  }

  async Login() {
    this.action = $localize`Se connecter`;
    const errorService = ErrorService.instance;
    this.login_serv_nest
      .Login(this.VM.Login, this.VM.Password)
      .then((compte) => {
        GlobalService.instance.updateCompte(compte);
        GlobalService.instance.updateLoggedin(true);
        this.action = $localize`Se connecter à un projet`;
        this.login_serv_nest
          .GetProject(compte.id)
          .then((projets) => {
            this.projets = projets;
            if (this.projets.length == 1) {
              this.projets_select = this.projets[0];
              GlobalService.instance.updateProjet(this.projets[0]);
              GlobalService.instance.updateOtherProject(this.projets);
              this.router.navigate(['/menu']);
            } else {
              GlobalService.instance.updateOtherProject(this.projets);
              this.VM.projets = this.projets;
            }
          })
          .catch((error: Error) => {
            let o = errorService.CreateError(this.action, error.message);
            errorService.emitChange(o);
          });
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      })
      .catch((error: Error) => {
        let o = errorService.CreateError(this.action, error.message);
        errorService.emitChange(o);
      });
  }
  LogOut() {
    this.action = $localize`Se déconnecter`;
    const errorService = ErrorService.instance;
    this.login_serv_nest
      .Logout()
      .then((ok) => {
        if (ok) {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
          this.projets = null;
          this.router.navigate(['/login']);
        } else {
          let o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
        }
      })
      .catch((error: Error) => {
        let o = errorService.CreateError(this.action, error.message);
        errorService.emitChange(o);
        this.loading = false;
      });
  }

  async ConnecterProjet(){

  }

  ReinitMDP() {
    this.action = $localize`Réinitialiser le mot de passe`;
    const errorService = ErrorService.instance;
    this.login_serv_nest
      .ReinitMDP(this.VM.Login)
      .then((ok) => {
        if (ok) {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
        } else {
          let o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
        }
      })
      .catch((error: Error) => {
        let o = errorService.CreateError(this.action, error.message);
        errorService.emitChange(o);
        this.loading = false;
      });
  }

  SelectProject(event) {
    this.projets_select = this.projets.find((x) => x.id == event);
  }

  ConnectToProject() {
    this.action = $localize`Se connecter au projet`;
    this.loading = true;
    // Appel à la méthode Check_Login du service RidersService
    const errorService = ErrorService.instance;

    if (this.projets_select) {
      GlobalService.instance.updateProjet(this.projets_select);
      if(this.projets_select.admin){
        GlobalService.instance.updateMenuType('ADMIN');
        GlobalService.instance.updateSelectedMenuStatus('MENU');
        this.router.navigate(['/menu-admin']);
      } else {
        GlobalService.instance.updateMenuType('APPLI');
        GlobalService.instance.updateSelectedMenuStatus('MENU');
        this.router.navigate(['/menu']);
      }
      this.loading = false;
    } else {
      let o = errorService.CreateError(
        this.action,
        $localize`Pas de projet sélectionné`
      );
      errorService.emitChange(o);
      this.loading = false;
    }
  }
}

import { Component,  OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment.prod';
import { CompteService } from '../../services/compte.service';
import { ErrorService } from '../../services/error.service';
import { GlobalService } from '../../services/global.services';
import { LoginNestService } from '../../services/login.nest.service';
import { ProjetService } from '../../services/projet.service';
import { Login_Projet_VM, Login_VM } from '../../class/login_vm';
import { AppStore } from '../app.store';
import { MailService } from '../../services/mail.service';
import { Projet_VM } from '@shared/index';

@Component({
  standalone: false,
  selector: 'app-login-projet',
  templateUrl: './login-projet.component.html',
  styleUrls: ['./login-projet.component.css'],
})
export class LoginProjetComponent implements OnInit {
  VM: Login_Projet_VM = new Login_Projet_VM();
  action: string;
  loading: boolean;
  libelle_titre:string = $localize`Saisissez l'email du projet pour vous connecter`;

  constructor(
    private login_serv_nest: LoginNestService,
    private compte_serv: CompteService,
    private router: Router,
    private route: ActivatedRoute,
    public GlobalService: GlobalService,
    private proj_serv:ProjetService, 
    public store: AppStore,
    public mailserv:MailService
  ) {
    this.VM.Login = environment.defaultloginProjet;
    this.VM.Password = environment.defaultloginpassword;
  }

  ngOnInit(): void {
        this.action = $localize`Chargement de la page`;
    const errorService = ErrorService.instance;
  }

   validateLogin() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.VM.isLoginValid = emailRegex.test(this.VM.Login);
    this.valide();
   
  }

  validatePassword(mdp:string) {
    const hasMinLength = mdp.length >= 8;
    const hasNumber = /\d/.test(mdp);
    this.VM.isPasswordValid = hasMinLength && hasNumber;
    this.valide();
  }

  valide(){
if (this.VM.isLoginValid && this.VM.isPasswordValid) {
      this.VM.isValid = true;
    } else {
      this.VM.isValid = false;
    }

  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
        this.validatePassword(this.VM.Password);
        if (this.VM.isValid) {
          this.Login();
        }
    }
  }
 


  async Login() {
    this.action = $localize`Se connecter`;
    const errorService = ErrorService.instance;
    this.proj_serv.Login(this.VM.Login, this.VM.Password).then((pvm:Projet_VM) => {
       
             this.store.login_projet(pvm);
        this.store.updateappli('ADMIN');
        this.store.updateSelectedMenu('MENU');
        this.router.navigate(['\menu-admin']);
      }).catch((error: Error) => {
        let o = errorService.CreateError(this.action, error);
            this.store.logout_projet();
        errorService.emitChange(o);
      });      
  }
  LogOut() {
    this.action = $localize`Se déconnecter`;
    const errorService = ErrorService.instance;
    this.store.logout_projet();
    let o = errorService.OKMessage(this.action);
    errorService.emitChange(o);
    this.router.navigate(['/login-projet']);
    
  }


  ReinitMDP() {
    this.action = $localize`Réinitialiser le mot de passe projet`;
    const errorService = ErrorService.instance;
    this.proj_serv
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
 
}

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment.prod';
import { CompteService } from '../../services/compte.service';
import { ErrorService } from '../../services/error.service';
import { GlobalService } from '../../services/global.services';
import { LoginNestService } from '../../services/login.nest.service';
import { Compte_VM, PreLoginResponse, ProjetView } from '@shared/lib/compte.interface';
import { ProjetService } from '../../services/projet.service';
import { Login_VM } from '../../class/login_vm';
import { AppStore } from '../app.store';
import { MailService } from '../../services/mail.service';
import { MailInput } from '@shared/lib/mail-input.interface';

@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  VM: Login_VM = new Login_VM();
  action: string;
  projets: ProjetView[];
  projets_select: ProjetView = null;
  selectedLogin:boolean = false;
  @Output() essai = new EventEmitter<Compte_VM>();
  @Input() context:"REINIT" | "ACTIVATE" | "SEANCE" | "MENU" | "ESSAI" | "CREATE" = "MENU" // contexte d'accès à la page
  @Input() login_seance:string = null; // login à utiliser dans le contexte SEANCE
  loading: boolean;
  libelle_titre:string = $localize`Saisissez votre email pour vous connecter`;
  psw_projet: string = null;
  reponse:string=null;
  id_adherent:number =null;
  id_seance:number=null;

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
    this.VM.Login = environment.defaultlogin;
    this.VM.Password = environment.defaultpassword;
  }

  ngOnInit(): void {
        this.action = $localize`Chargement de la page`;
    const errorService = ErrorService.instance;
    this.route.queryParams.subscribe((params) => {
      if('context' in params){
        try {
          this.context = params['context'];
        } catch (error) {
              let o = errorService.CreateError(this.action, $localize`Erreur sur la requête`);
              errorService.emitChange(o);
              this.router.navigate(['/login'])
              return;
        }
      }
      switch (this.context) {
        case "ACTIVATE":
        case "REINIT":
            const token = params['token'];
            const user = params['user'];
            if(!token){
              let o = errorService.CreateError(this.action, $localize`Token absent sur la requête`);
              errorService.emitChange(o);
              this.router.navigate(['/login'])
              return;
            }
             if(!user){
              let o = errorService.CreateError(this.action, $localize`Login absent sur la requête`);
              errorService.emitChange(o);
              this.router.navigate(['/login'])
              return;
            }
            this.compte_serv.CheckToken(user, token).then((boo) => {
            if (boo) {
              this.compte_serv.getAccountLogin(user).then((compte:Compte_VM) => {
                this.VM.compte = compte;
                if(this.context == "REINIT"){
                    this.action = $localize`Réinitialiser le mot de passe`;
                    let o = errorService.OKMessage(this.action);
                    errorService.emitChange(o);
                    this.router.navigate(['/reinit-mdp']);
                    return;
                }
                this.action = $localize`Activer le compte`;
                    let o = errorService.OKMessage(this.action);
                    errorService.emitChange(o);
                    this.router.navigate([''], { queryParams: { context: 'MENU' } });
                    return;
                   }); 
                               
              } else {              
                   let o = errorService.UnknownError(this.action);
                    errorService.emitChange(o);
                    this.router.navigate(['/login'])

              }
            }).catch((error: Error) => {
          let o = errorService.CreateError(this.action, error.message);
            this.store.clearSession();
          errorService.emitChange(o);
        });
          break; 
        case "ESSAI":
          this.libelle_titre = $localize`Saisissez une adresse mail pour vous connecter et essayer la séance`;
          break; 
        case "CREATE":
          this.libelle_titre = $localize`Saisissez une adresse mail pour vous connecter ou créer un compte`;
          break; 
        case "SEANCE":
          this.libelle_titre = $localize`Connectez-vous pour répondre au sondage de présence`;
          if(this.login_seance){
            this.VM.Login = this.login_seance;
            this.validateLogin();
            this.Login();
          }
          break; 
      }
      if (!this.VM.Login) {
        this.VM.Login = environment.defaultlogin ?? '';
        this.validateLogin();
    }  
    });
  }

   validateLogin() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.VM.isLoginValid = emailRegex.test(this.VM.Login);
    this.VM.creer_compte = false;
    this.valide();
   
  }

  validatePassword(mdp:string) {
    const hasMinLength = mdp.length >= 8;
    const hasNumber = /\d/.test(mdp);
    this.VM.isPasswordValid = hasMinLength && hasNumber;
    this.valide();
  }

  valide(){
    if(this.VM.mdp_requis){
    if (this.VM.isLoginValid && this.VM.isPasswordValid) {
      this.VM.isValid = true;
    } else {
      this.VM.isValid = false;
    }
    } else {
      this.VM.isValid = this.VM.isLoginValid;
    }
  }
  
  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (this.VM.mdp_requis) {
        this.validatePassword(this.VM.Password);
        if (this.VM.isValid) {
          this.Login();
        }
      } else {
       this.Login()
 }
}

}


onKeyPressMdp(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    this.validatePassword(this.VM.Password);
    if (this.VM.isValid) {
      this.Login();
    }
  }
}




  SelectionnerCompteAdmin() {
    this.action = $localize`Se connecter en tant qu'admin`;
    const errorService = ErrorService.instance;
    this.proj_serv.CheckMDP(this.VM.Password).then((ok:boolean) => {
      if(ok){
        this.compte_serv.getAccountLogin(this.VM.Login).then((compte:Compte_VM) => {          
          this.essai.emit(compte);
          return;
        }).catch((error: Error) => {
          let o = errorService.CreateError(this.action, error.message);
          errorService.emitChange(o);
          return;
        });
      } else {
        let o = errorService.CreateError(this.action, $localize`Mot de passe administrateur incorrect`);
          errorService.emitChange(o);
          return;
      }

    }).catch((error: Error) => {
          let o = errorService.CreateError(this.action, error.message);
            this.store.logout();
          errorService.emitChange(o);
        });
  }

  PreCreerCompte(){
    this.action = $localize`Se connecter`;
    const errorService = ErrorService.instance;
      this.VM.creer_compte = true;
      this.VM.mdp_requis = true;
      this.selectedLogin = true;
      let o = errorService.Create(this.action, $localize`Aucun compte trouvé, vous pouvez procéder à la création d'un compte`, "Warning");
      errorService.emitChange(o);

  }
  CreerCompte(mdp:boolean){
    let message = $localize`Voulez-vous confirmer la création d'un compte sans mot de passe ?`
    if(mdp){
message = $localize`Voulez-vous confirmer la création d'un compte avec mot de passe ?`
    }
    let co = window.confirm(message);
    if(co){
      let newCompte = new Compte_VM();
      newCompte.actif = false;
      newCompte.mail_actif = false;
      newCompte.email = this.VM.Login;
      if(mdp){
      newCompte.password = this.VM.Password;
      } else {
        newCompte.password = null;
      }
      newCompte.echec_connexion = 0;
      this.essai.emit(newCompte);
    } else {
      this.VM.creer_compte = false;
    }
  }

  async PreLogin(){
    this.action = $localize`Checker les informations de connexion`;
    const errorService = ErrorService.instance;
    this.login_serv_nest.PreLogin(this.VM.Login).then((response:PreLoginResponse) => {
      this.VM.mdp_requis = response.password_required;
      this.store.setmode(response.mode);
    }).catch((error: Error) => {
      let o = errorService.CreateError(this.action, error.message);
        this.store.clearSession();
      errorService.emitChange(o); 
    });
  }

  async Login() {
    this.action = $localize`Se connecter`;
    const errorService = ErrorService.instance;
    this.login_serv_nest.Login(this.VM.Login, this.VM.Password).then((compte_vm:Compte_VM) => {
       
          if(this.context == "ESSAI" || this.context == "CREATE"){
            this.essai.emit(compte_vm);
            return;
          }
             this.store.l(compte_vm);
          this.VM.compte = compte_vm;
        this.store.upda('APPLI');
        this.store.updateSelectedMenu('MENU');
      this.action = $localize`Rechercher des projets`;
        this.login_serv_nest.GetProject(compte_vm.id).then((projets : ProjetView[]) => {
          this.projets = projets;
          this.store.updateListeProjet(this.projets);
          if (this.projets.length == 1) {
            this.projets_select = this.projets[0];
            this.ConnectToProject();
          } else  if (this.projets.length > 1) {
            this.projets_select = this.projets[0];
          } else {
            let o = errorService.CreateError(this.action, $localize`Aucun projet trouvé`);
            this.store.clearSession();
            errorService.emitChange(o);
          }
        }).catch((error: Error) => {
          let o = errorService.CreateError(this.action, error.message);
            this.store.clearSession();
          errorService.emitChange(o);
        });
      }).catch((error: Error) => {
        if(error.message == "PASSWORD_REQUIRED"){
          this.VM.mdp_requis = true;
          return;
        }
        if(this.context == "ESSAI" || this.context == "CREATE"){
          this.PreCreerCompte();
        } else {
        let o = errorService.CreateError(this.action, error);
            this.store.clearSession();
        errorService.emitChange(o);

        }
      });      
  }
  LogOut() {
    this.action = $localize`Se déconnecter`;
    const errorService = ErrorService.instance;
    this.store.clearSession();
    let o = errorService.OKMessage(this.action);
    errorService.emitChange(o);
    this.router.navigate(['/login']);
    
  }


  ReinitMDP() {
    let c = window.confirm($localize`Voulez-vous réinitialiser votre mot de passe ?`);
    if (!c) {
      return;
    }
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

async ConnectToProject() {
  this.action = $localize`Se connecter au projet`;
  this.loading = true;
  const errorService = ErrorService.instance;

  if (!this.projets_select) {
    const o = errorService.CreateError(
      this.action,
      $localize`Pas de projet sélectionné`
    );
    errorService.emitChange(o);
    this.loading = false;
    return;
  }

  try {
    await this.projectContextService.connectToProject(this.projets_select);

    if (this.context === 'SEANCE') {
      this.essai.emit(this.VM.compte);
      this.loading = false;
      return;
    }

    this.store.updateSelectedMenu('MENU');
    await this.router.navigate(['/menu']);
    this.loading = false;
  } catch (err: any) {
    this.loading = false;
    const msg = err?.message || 'Erreur inconnue';
    const o = errorService.CreateError(this.action, msg);
    errorService.emitChange(o);

    this.store.clearSession();
    localStorage.removeItem('auth_token');
    await this.router.navigate(['/login']);
  }
}



  async TestMail(){
    const MI = new MailInput();
    MI.to = "jechapartegui@gmail.com";
    MI.subject = "Test Assolutions";
    MI.from = "usivry.roller@gmail.com";
    MI.html = "Test ✅"
    await this.mailserv.Mail(MI);
  }

 
}

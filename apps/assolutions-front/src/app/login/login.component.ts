import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment.prod';
import { CompteService } from '../../services/compte.service';
import { ErrorService } from '../../services/error.service';
import { GlobalService } from '../../services/global.services';
import { LoginNestService } from '../../services/login.nest.service';
import { Compte_VM, ProjetView } from '@shared/lib/compte.interface';
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
  @Output() essai = new EventEmitter<Compte_VM>();
  @Input() context:"REINIT" | "ACTIVATE" | "SEANCE" | "MENU" | "ESSAI" | "CREATE" = "MENU" // contexte d'accès à la page
  loading: boolean;
  libelle_titre:string = $localize`Saisissez votre email pour vous connecter`;
  psw_projet: string = null;

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
          console.log("passage");
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
            this.store.logout();
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
          break; 
      }
      this.VM.Login =  environment.defaultlogin;    
      this.validateLogin();
    });
  }

   validateLogin() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.VM.isLoginValid = emailRegex.test(this.VM.Login);
    this.VM.creer_compte = false;
    this.valide();
   
  }

  validatePassword() {
    const hasMinLength = this.VM.Password.length >= 8;
    const hasNumber = /\d/.test(this.VM.Password);
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
        this.validatePassword();
        if (this.VM.isValid) {
          this.Login();
        }
      } else {
        this.validatePassword();
        if (this.VM.isValid) {
        this.PreLogin();
        }
      }
    }
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
        if(error == "ACCOUNT_NOT_ACTIVE"){
        let c = window.confirm($localize`Compte inactif : voulez-vous renvoyer un mail d'activation ?`);
        if(c){
          this.action = $localize`Envoi d'un mail d'activation`;
          this.mailserv.MailActivation(this.VM.Login).then(() => {
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
          }).catch((err: Error) => {
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
          });
          return;
        }
        let o = errorService.Create(this.action, errorService.interpret_error(error), "Warning");
        errorService.emitChange(o);
        } else {
 if(this.context == "ESSAI" || this.context == "CREATE"){
          this.PreCreerCompte();
        } else {
        let o = errorService.CreateError(this.action, error);
        errorService.emitChange(o);
        }
        }
         
      });
  }

  PreCreerCompte(){
    this.action = $localize`Se connecter`;
    const errorService = ErrorService.instance;
      this.VM.creer_compte = true;
      this.VM.mdp_requis = true;
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

  async Login() {
    this.action = $localize`Se connecter`;
    const errorService = ErrorService.instance;
    this.login_serv_nest.Login(this.VM.Login, this.VM.Password).then((compte_vm:Compte_VM) => {
          this.store.login(compte_vm);
          if(this.context == "ESSAI" || this.context == "CREATE"){
            this.essai.emit(compte_vm);
            return;
          }
          this.VM.compte = compte_vm;
        this.store.updateappli('APPLI');
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
            this.store.logout();
            errorService.emitChange(o);
          }
        }).catch((error: Error) => {
          let o = errorService.CreateError(this.action, error.message);
            this.store.logout();
          errorService.emitChange(o);
        });
      }).catch((error: Error) => {
        if(this.context == "ESSAI" || this.context == "CREATE"){
          this.PreCreerCompte();
        } else {
        let o = errorService.CreateError(this.action, error);
            this.store.logout();
        errorService.emitChange(o);

        }
      });      
  }
  LogOut() {
    this.action = $localize`Se déconnecter`;
    const errorService = ErrorService.instance;
    this.store.logout();
    let o = errorService.OKMessage(this.action);
    errorService.emitChange(o);
    this.router.navigate(['/login']);
    
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

  async ConnectToProject() {
    this.action = $localize`Se connecter au projet`;
    this.loading = true;
    // Appel à la méthode Check_Login du service RidersService
    const errorService = ErrorService.instance;

    if (this.projets_select) {
       
        this.store.updateProjet(this.projets_select);
         try {
          const adh = await this.proj_serv.GetActiveSaison();
          this.store.updateSaisonActive(adh);
          
          if (!adh) {
            throw new Error($localize`Pas de saison active détectée sur le projet`);
          }

          // suite du traitement
        } catch (err: any) {
          this.loading = false;
          let o = errorService.CreateError(this.action, err.message || 'Erreur inconnue');
          errorService.emitChange(o);
          this.store.logout();
          this.router.navigate(['/login']);
          return;
        }
        this.store.updateSelectedMenu('MENU');
        this.router.navigate(['/menu']);
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

  async TestMail(){
    const MI = new MailInput();
    MI.to = "jechapartegui@gmail.com";
    MI.subject = "Test Assolutions";
    MI.from = "usivry.roller@gmail.com";
    MI.html = "Test ✅"
    await this.mailserv.Mail(MI);
  }

 
}

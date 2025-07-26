import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment.prod';
import { CompteService } from '../../services/compte.service';
import { ErrorService } from '../../services/error.service';
import { GlobalService } from '../../services/global.services';
import { LoginNestService } from '../../services/login.nest.service';
import { Compte_VM, ProjetView } from '@shared/src/lib/compte.interface';
import { ProjetService } from '../../services/projet.service';
import { Login_VM } from '../../class/login_vm';

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
  context:"REINIT" | "ACTIVATE" | "SEANCE" | "MENU" | "ESSAI" = "MENU" // contexte d'accès à la page
  loading: boolean;
  libelle_titre:string = $localize`Saisissez votre email pour vous connecter`;
  psw_projet: string = null;

  constructor(
    private login_serv_nest: LoginNestService,
    private compte_serv: CompteService,
    private router: Router,
    private route: ActivatedRoute,
    public GlobalService: GlobalService,
    private proj_serv:ProjetService
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
              this.compte_serv.getAccountLogin(this.VM.Login).then((compte:Compte_VM) => {
                this.VM.compte = compte;
                this.VM.compte.token = "";
                this.VM.compte.actif = true;
                this.GlobalService.updateCompte(compte);
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
                    this.router.navigate(['/login']);
                   }); 
                               
              } else {
              
                   let o = errorService.UnknownError(this.action);
              errorService.emitChange(o);
              this.router.navigate(['/login'])

              }
            });
          break; 
        case "ESSAI":
          this.libelle_titre = $localize`Saisissez une adresse mail pour vous connecter et essayer la séance`;
          break; 
        case "SEANCE":
          this.libelle_titre = $localize`Connectez-vous pour répondre au sondage de présence`;
          break; 
      }     
    });
  }

   validateLogin() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.VM.isLoginValid = emailRegex.test(this.VM.Login);
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
    this.login_serv_nest.Login(this.VM.Login, this.VM.Password).then((compte_vm:Compte_VM) => {
          GlobalService.instance.updateCompte(compte_vm);
          this.VM.compte = compte_vm;
        GlobalService.instance.updateTypeApplication('APPLI');
        GlobalService.instance.updateSelectedMenuStatus('MENU');
        GlobalService.instance.updateLoggedin(true); 
      this.action = $localize`Rechercher des projets`;
        this.login_serv_nest.GetProject(compte_vm.id).then((projets : ProjetView[]) => {
          this.projets = projets;
          GlobalService.instance.updateListeProjet(this.projets);
          if (this.projets.length == 1) {
            this.projets_select = this.projets[0];
            this.ConnectToProject();
          } else  if (this.projets.length > 1) {
            this.projets_select = this.projets[0];
          } else {
            let o = errorService.CreateError(this.action, $localize`Aucun projet trouvé`);
            errorService.emitChange(o);
          }
        }).catch((error: Error) => {
          let o = errorService.CreateError(this.action, error.message);
          errorService.emitChange(o);
        });
      }).catch((error: Error) => {
        let o = errorService.CreateError(this.action, error.message);
        errorService.emitChange(o);
      });      
  }
  LogOut() {
    this.action = $localize`Se déconnecter`;
    const errorService = ErrorService.instance;
    this.login_serv_nest.Logout().then((ok) => {
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
       
        GlobalService.instance.updateProjet(this.projets_select);
        GlobalService.instance.updateProf(this.projets_select.prof);
         try {
          const adh = await this.proj_serv.GetActiveSaison();
          this.GlobalService.saison_active = adh;
          
          if (!adh) {
            throw new Error($localize`Pas de saison active détectée sur le projet`);
          }

          // suite du traitement
        } catch (err: any) {
          this.loading = false;
          let o = errorService.CreateError(this.action, err.message || 'Erreur inconnue');
          errorService.emitChange(o);
          GlobalService.instance.updateProjet(null);
          GlobalService.instance.updateProf(false);
          GlobalService.instance.updateLoggedin(false);
          this.router.navigate(['/login']);
          return;
        }
        GlobalService.instance.updateSelectedMenuStatus('MENU');
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
}

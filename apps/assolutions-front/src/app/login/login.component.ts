import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment.prod';
import { CompteService } from '../../services/compte.service';
import { ErrorService } from '../../services/error.service';
import { GlobalService } from '../../services/global.services';
import { LoginNestService } from '../../services/login.nest.service';
import { Compte_VM, MeResponse, PreLoginResponse, ProjetView, Session } from '@shared/lib/compte.interface';
import { Login_VM } from '../../class/login_vm';
import { AppStore } from '../app.store';

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

  selectedLogin: boolean = false;

  @Input() context: 'REINIT' | 'ACTIVATE' | 'SEANCE' | 'MENU' | 'ESSAI' = 'MENU'; // CREATE retiré
  @Input() login_seance: string = null;

  loading: boolean;
  libelle_titre: string = $localize`Saisissez votre email pour vous connecter`;

  constructor(
    private login_serv_nest: LoginNestService,
    private compte_serv: CompteService,
    private router: Router,
    private route: ActivatedRoute,
    public GlobalService: GlobalService,
    public store: AppStore
  ) {
    this.VM.Login = environment.defaultlogin;
    this.VM.Password = environment.defaultpassword;
  }

  ngOnInit(): void {
    this.action = $localize`Chargement de la page`;
    const errorService = ErrorService.instance;

    this.route.queryParams.subscribe((params) => {
      if ('context' in params) {
        try {
          this.context = params['context'];
        } catch (error) {
          const o = errorService.CreateError(this.action, $localize`Erreur sur la requête`);
          errorService.emitChange(o);
          this.router.navigate(['/login']);
          return;
        }
      }

      switch (this.context) {
        case 'ACTIVATE':
        case 'REINIT': {
          const token = params['token'];
          const user = params['user'];

          if (!token) {
            const o = errorService.CreateError(this.action, $localize`Token absent sur la requête`);
            errorService.emitChange(o);
            this.router.navigate(['/login']);
            return;
          }
          if (!user) {
            const o = errorService.CreateError(this.action, $localize`Login absent sur la requête`);
            errorService.emitChange(o);
            this.router.navigate(['/login']);
            return;
          }

          this.compte_serv
            .CheckToken(user, token)
            .then((boo) => {
              if (boo) {
                this.compte_serv.getAccountLogin(user).then((compte: Compte_VM) => {
                  this.VM.compte = compte;

                  if (this.context === 'REINIT') {
                    this.action = $localize`Réinitialiser le mot de passe`;
                    const o = errorService.OKMessage(this.action);
                    errorService.emitChange(o);
                    this.router.navigate(['/reinit-mdp']);
                    return;
                  }

                  this.action = $localize`Activer le compte`;
                  const o = errorService.OKMessage(this.action);
                  errorService.emitChange(o);
                  this.router.navigate([''], { queryParams: { context: 'MENU' } });
                  return;
                });
              } else {
                const o = errorService.UnknownError(this.action);
                errorService.emitChange(o);
                this.router.navigate(['/login']);
              }
            })
            .catch((error: Error) => {
              const o = errorService.CreateError(this.action, error.message);
              this.store.clearSession();
              errorService.emitChange(o);
            });

          break;
        }

        case 'ESSAI':
          this.libelle_titre = $localize`Saisissez une adresse mail pour vous connecter et essayer la séance`;
          break;

        case 'SEANCE':
          this.libelle_titre = $localize`Connectez-vous pour répondre au sondage de présence`;
          if (this.login_seance) {
            this.VM.Login = this.login_seance;
            this.validateLogin();
            this.Login();
          }
          break;

        case 'MENU':
        default:
          this.libelle_titre = $localize`Saisissez votre email pour vous connecter`;
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
    this.valide();
  }

  validatePassword(mdp: string) {
    const hasMinLength = mdp.length >= 8;
    const hasNumber = /\d/.test(mdp);
    this.VM.isPasswordValid = hasMinLength && hasNumber;
    this.valide();
  }

  valide() {
    if (this.VM.mdp_requis) {
      this.VM.isValid = this.VM.isLoginValid && this.VM.isPasswordValid;
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
        this.Login();
      }
    }
  }

  async Login() {
    this.action = $localize`Se connecter`;
    const errorService = ErrorService.instance;

    if (this.VM.check_login.key === false) {
      this.action = $localize`Validation de l'email`;

      this.login_serv_nest
        .PreLogin(this.VM.Login)
        .then((prelogin: PreLoginResponse) => {
          this.VM.check_login = { key: true, value: '' };
          this.VM.mode = prelogin.mode;
          this.VM.mdp_requis = prelogin.password_required;

          // Auto-login si pas de mot de passe requis + mode APPLI
          if (!this.VM.mdp_requis && this.VM.mode === 'APPLI') {
            this.login_serv_nest
              .Login(this.VM.Login, null)
              .then(async (mr: MeResponse) => {
                this.VM.compte = mr.compte;
                this.VM.projets = mr.projects;

                const s: Session = {
                  token: mr.token,
                  mode: this.VM.mode,
                  compte: mr.compte,
                  projects: mr.projects,
                  selectedProjectId: mr.projects.length === 1 ? mr.projects[0].id : null,
                  rights: mr.projects.length === 1 ? mr.projects[0].rights : null,
                };

                await this.store.setSession(s);

                if (s.projects.length > 1) {
                  this.projets = s.projects;
                  return;
                }

                this.store.selectProject(s.selectedProjectId);
                this.store.updateSelectedMenu('MENU');
                this.router.navigate(['/menu']);
              })
              .catch((error: Error) => {
                const o = errorService.CreateError(this.action, error.message);
                errorService.emitChange(o);
                this.store.clearSession();
                this.VM.check_login = { key: false, value: error.message };
              });
          }
        })
        .catch((error: Error) => {
          const o = errorService.CreateError(this.action, error.message);
          errorService.emitChange(o);
          this.VM.check_login = { key: false, value: error.message };
        });
    } else {
      // Saisie mdp
      this.login_serv_nest
        .Login(this.VM.Login, this.VM.Password)
        .then((mr: MeResponse) => {
          if (this.VM.mode === 'APPLI') {
            this.VM.compte = mr.compte;
            this.VM.projets = mr.projects;

            const s: Session = {
              token: mr.token,
              mode: this.VM.mode,
              compte: mr.compte,
              projects: mr.projects,
              selectedProjectId: mr.projects.length === 1 ? mr.projects[0].id : null,
              rights: mr.projects.length === 1 ? mr.projects[0].rights : null,
            };

            this.store.setSession(s);

            if (s.projects.length > 1) {
              this.projets = s.projects;
              return;
            }

            this.store.selectProject(s.selectedProjectId);
            this.store.updateSelectedMenu('MENU');
            this.router.navigate(['/menu']);
            const o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            return;
          } else {
            // mode admin
            const s: Session = {
              token: mr.token,
              mode: this.VM.mode,
              compte: mr.compte,
              projects: mr.projects,
              selectedProjectId: mr.projects[0].id,
              rights: null,
            };

            this.store.setSession(s);
            this.store.updateSelectedMenu('MENU-ADMIN');
            this.router.navigate(['/menu-admin']);
            const o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            return;
          }
        })
        .catch((error: Error) => {
          const o = errorService.CreateError(this.action, error.message);
          errorService.emitChange(o);
          this.VM.check_login = { key: true, value: error.message };
        });
    }
  }

  LogOut() {
    this.action = $localize`Se déconnecter`;
    const errorService = ErrorService.instance;
    this.store.clearSession();
    const o = errorService.OKMessage(this.action);
    errorService.emitChange(o);
    this.router.navigate(['/login']);
  }

  ReinitMDP() {
    const c = window.confirm($localize`Voulez-vous réinitialiser votre mot de passe ?`);
    if (!c) return;

    this.action = $localize`Réinitialiser le mot de passe`;
    const errorService = ErrorService.instance;

    this.login_serv_nest
      .ReinitMDP(this.VM.Login)
      .then((ok) => {
        if (ok) {
          const o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
        } else {
          const o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
        }
      })
      .catch((error: Error) => {
        const o = errorService.CreateError(this.action, error.message);
        errorService.emitChange(o);
        this.loading = false;
      });
  }

  SelectProject(event: any) {
    this.projets_select = this.projets.find((x) => x.id == event);
  }

  async ConnectToProject() {
    this.action = $localize`Se connecter au projet`;
    const errorService = ErrorService.instance;

    if (!this.projets_select) {
      const o = errorService.CreateError(this.action, $localize`Pas de projet sélectionné`);
      errorService.emitChange(o);
      return;
    }

    try {
      this.store.selectProject(this.projets_select.id);
      this.store.updateSelectedMenu('MENU');
      this.router.navigate(['/menu']);
      const o = errorService.OKMessage(this.action);
      errorService.emitChange(o);
    } catch (err: any) {
      const msg = err?.message || 'Erreur inconnue';
      const o = errorService.CreateError(this.action, msg);
      errorService.emitChange(o);

      this.store.clearSession();
      localStorage.removeItem('auth_token');
      await this.router.navigate(['/login']);
    }
  }
}

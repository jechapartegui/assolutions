import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment.prod';
import { ErrorService } from '../../services/error.service';
import { GlobalService } from '../../services/global.services';
import {  MeResponse, PreLoginResponse, ProjetView, Session } from '@shared/lib/compte.interface';
import { AppStore } from '../app.store';
import { AuthApiService } from '../../services/auth-api.service';
import { CompteApiService } from '../../services/compte-api.service';
import { ProjectApiService } from '../../services/project-api.service';
import { Login_VM } from '../../vm/login.vm';
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
    private login_serv_nest: AuthApiService,
    private project_serv: ProjectApiService,
    private compte_serv: CompteApiService,
    private router: Router,
    private route: ActivatedRoute,
    public GlobalService: GlobalService,
    public store: AppStore
  ) {
    this.VM.compte.login = environment.defaultlogin;
    this.VM.compte.password = environment.defaultpassword;
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
          this.VM.compte.login = user;
          this.VM.compte.activation_token = token;

          this.compte_serv
            .check_token(this.VM.compte.login, this.VM.compte.activation_token)
            .then((cpt) => {
              if (cpt) {
                this.VM.compte = cpt;

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
                this.router.navigate(['/login']);
                  return;
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
            this.VM.compte.login = this.login_seance;
            this.validateLogin();
            this.Login();
          }
          break;

        case 'MENU':
        default:
          this.libelle_titre = $localize`Saisissez votre email pour vous connecter`;
          break;
      }

      if (!this.VM.compte.login) {
        this.VM.compte.login = environment.defaultlogin ?? '';
        this.validateLogin();
      }
    });
  }

  validateLogin() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.VM.isLoginValid = emailRegex.test(this.VM.compte.login);
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
        this.validatePassword(this.VM.compte.password);
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
        .prelogin(this.VM.compte.login)
        .then((prelogin: PreLoginResponse) => {
          this.VM.check_login = { key: true, value: '' };
          this.VM.mode = prelogin.mode;
          this.VM.mdp_requis = prelogin.password_required;

          // Auto-login si pas de mot de passe requis + mode APPLI
          if (!this.VM.mdp_requis && this.VM.mode === 'APPLI') {
      this.action = $localize`Connexion sans mot de passe`;
            this.login_serv_nest
              .login(this.VM.compte.login, null)
              .then(async (mr: MeResponse) => {
                this.VM.compte = mr.compte;
      this.action = $localize`Lister les projets associés au compte`;
                this.project_serv.listMine().then(async (projets) => {
                  this.VM.projets = projets;
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
                }).catch((error: Error) => {
                const o = errorService.CreateError(this.action, error.message);
                errorService.emitChange(o);
                this.store.clearSession();
                this.VM.check_login = { key: false, value: error.message };
              });
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
      // Saisie mdp.
      this.action = $localize`Connexion avec mot de passe`;
           this.login_serv_nest
              .login(this.VM.compte.login, this.VM.compte.password)
              .then(async (mr: MeResponse) => {
                this.VM.compte = mr.compte;
      this.action = $localize`Lister les projets associés au compte`;
                this.project_serv.listMine().then(async (projets) => {
                  this.VM.projets = projets;
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
                }).catch((error: Error) => {
                const o = errorService.CreateError(this.action, error.message);
                errorService.emitChange(o);
                this.store.clearSession();
                this.VM.check_login = { key: false, value: error.message };
              });
              })
              .catch((error: Error) => {
                const o = errorService.CreateError(this.action, error.message);
                errorService.emitChange(o);
                this.store.clearSession();
                this.VM.check_login = { key: false, value: error.message };
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

    this.login_serv_nest.reinit_mdp(this.VM.compte.login)
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

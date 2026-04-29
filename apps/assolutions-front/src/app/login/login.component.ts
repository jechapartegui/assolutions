import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment.prod';
import { ErrorService } from '../../services/error.service';
import { GlobalService } from '../../services/global.services';
import { MeResponse, PreLoginResponse, ProjetView, Session } from '@shared/lib/compte.interface';
import { AppStore } from '../app.store';
import { AuthApiService } from '../../services/auth-api.service';
import { CompteApiService } from '../../services/compte-api.service';
import { ProjectApiService } from '../../services/project-api.service';
import { Login_VM } from '../../vm/login.vm';
import { AdhesionApiService } from '../../services/adhesion-api.service';

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

  selectedLogin = false;
  showPassword = false;

  /** Projet demandé depuis un lien externe : /login?context=CREATE&projectId=123 */
  requestedProjectId: number | null = null;
  requestedProject: any = null;

  @Input() context: 'REINIT' | 'ACTIVATE' | 'SEANCE' | 'MENU' | 'ESSAI' | 'CREATE' = 'MENU';
  @Input() login_seance: string = null;

  loading = false;
  libelle_titre: string = $localize`Saisissez votre email pour vous connecter`;

  constructor(
    private login_serv_nest: AuthApiService,
    private adhesion_serv: AdhesionApiService,
    private project_serv: ProjectApiService,
    private compte_serv: CompteApiService,
    private router: Router,
    private route: ActivatedRoute,
    public GlobalService: GlobalService,
    public store: AppStore
  ) {
    this.VM.compte.login = environment.defaultlogin ?? '';
    this.VM.compte.password = environment.defaultpassword ?? '';
    this.validateLogin();
  }

  ngOnInit(): void {
    this.action = $localize`Chargement de la page`;
    const errorService = ErrorService.instance;

    this.route.queryParams.subscribe(async (params) => {
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

      this.requestedProjectId = this.readProjectIdFromParams(params);

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
              }

              const o = errorService.UnknownError(this.action);
              errorService.emitChange(o);
              this.router.navigate(['/login']);
            })
            .catch((error: Error) => {
              const o = errorService.CreateError(this.action, error.message);
              this.store.clearSession();
              errorService.emitChange(o);
            });

          break;
        }

        case 'CREATE':
          await this.initCreateMode();
          break;

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

  private readProjectIdFromParams(params: any): number | null {
    const raw = params['projectId'] ?? params['projetId'] ?? params['idProjet'] ?? params['id'];
    const id = raw !== undefined && raw !== null && raw !== '' ? Number(raw) : null;
    return id !== null && Number.isFinite(id) && id > 0 ? id : null;
  }

  private async initCreateMode(): Promise<void> {
    const errorService = ErrorService.instance;

    if (!this.requestedProjectId) {
      this.libelle_titre = $localize`Lien d'inscription incomplet : aucun projet n'est indiqué.`;
      return;
    }

    this.loading = true;
    try {
      this.requestedProject = await this.project_serv.get(this.requestedProjectId);
      const nomProjet = this.requestedProject?.nom ? ` ${this.requestedProject.nom}` : '';
      this.libelle_titre = $localize`Connectez-vous ou créez un compte pour vous inscrire au projet${nomProjet}`;
    } catch (error: any) {
      const o = errorService.CreateError(
        $localize`Chargement du projet`,
        error?.message ?? $localize`Projet introuvable`
      );
      errorService.emitChange(o);
      this.libelle_titre = $localize`Projet introuvable ou inaccessible.`;
    } finally {
      this.loading = false;
    }
  }

  get canCreateAccount(): boolean {
    return this.context === 'CREATE' && !!this.requestedProjectId;
  }

  validateLogin() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.VM.isLoginValid = emailRegex.test(this.VM.compte.login ?? '');
    this.valide();
  }

  validatePassword(mdp: string) {
    const hasMinLength = (mdp ?? '').length >= 8;
    const hasNumber = /\d/.test(mdp ?? '');
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
      } else if (this.VM.isValid) {
        this.Login();
      }
    }
  }

  async Login() {
    this.action = $localize`Se connecter`;
    const errorService = ErrorService.instance;

    if (!this.VM.isLoginValid) return;

    if (this.VM.check_login.key === false) {
      this.action = $localize`Validation de l'email`;

      this.login_serv_nest
        .prelogin(this.VM.compte.login)
        .then((prelogin: PreLoginResponse) => {
          this.VM.check_login = { key: true, value: '' };
          this.VM.mode = prelogin.mode;
          this.VM.mdp_requis = prelogin.password_required;
          this.selectedLogin = this.VM.mdp_requis;

          if (!this.VM.mdp_requis && this.VM.mode === 'APPLI') {
            this.action = $localize`Connexion sans mot de passe`;
            this.login_serv_nest
              .login(this.VM.compte.login, null)
              .then((mr: MeResponse) => this.openSession(mr))
              .catch((error: Error) => this.handleLoginError(error));
          }
        })
        .catch((error: Error) => {
          const o = errorService.CreateError(this.action, error.message);
          errorService.emitChange(o);
          this.VM.check_login = { key: false, value: error.message };
        });
    } else {
      this.action = $localize`Connexion avec mot de passe`;
      this.login_serv_nest
        .login(this.VM.compte.login, this.VM.compte.password)
        .then((mr: MeResponse) => this.openSession(mr))
        .catch((error: Error) => this.handleLoginError(error));
    }
  }

  private async openSession(mr: MeResponse): Promise<void> {
    const errorService = ErrorService.instance;
    this.VM.compte = mr.compte;
    this.action = $localize`Lister les projets associés au compte`;

    try {
      const projets = await this.adhesion_serv.get();
      this.VM.projets = projets;

      const projectFromContext = this.findRequestedProject(projets);
      const autoProject = projectFromContext ?? (projets.length === 1 ? projets[0] : null);

      const s: Session = {
        token: mr.token,
        mode: this.VM.mode,
        compte: mr.compte,
        projects: projets,
        selectedProjectId: autoProject?.id ?? null,
        rights: autoProject?.rights ?? null,
      };

      await this.store.setSession(s);

      if (autoProject) {
        this.store.selectProject(autoProject.id);
        this.store.updateSelectedMenu('MENU');
        this.navigateAfterProjectSelection();
        return;
      }

      if (projets.length > 1) {
        this.projets = projets;
        this.projets_select = projectFromContext;
        return;
      }

      const o = errorService.CreateError(
        this.action,
        $localize`Aucun projet n'est associé à ce compte. Vous pouvez créer un compte uniquement depuis un lien d'inscription.`
      );
      errorService.emitChange(o);
    } catch (error: any) {
      const o = errorService.CreateError(this.action, error?.message ?? $localize`Erreur inconnue`);
      errorService.emitChange(o);
      this.store.clearSession();
      this.VM.check_login = { key: false, value: error?.message ?? '' };
    }
  }

  private findRequestedProject(projets: ProjetView[]): ProjetView | null {
    if (!this.requestedProjectId) return null;
    return projets.find((p) => Number(p.id) === Number(this.requestedProjectId)) ?? null;
  }

  private navigateAfterProjectSelection(): void {
    if (this.VM.mode === 'APPLI') {
      this.router.navigate(['/menu']);
    } else {
      this.router.navigate(['/menu-admin']);
    }
  }

  private handleLoginError(error: Error): void {
    const errorService = ErrorService.instance;
    const o = errorService.CreateError(this.action, error.message);
    errorService.emitChange(o);
    this.store.clearSession();
    this.VM.check_login = { key: false, value: error.message };
  }

  LogOut() {
    this.action = $localize`Se déconnecter`;
    const errorService = ErrorService.instance;
    this.store.clearSession();
    this.projets = null;
    this.projets_select = null;
    this.selectedLogin = false;
    this.VM.mdp_requis = false;
    this.VM.check_login = { key: false, value: '' };
    const o = errorService.OKMessage(this.action);
    errorService.emitChange(o);
    this.router.navigate(['/login']);
  }

  ReinitMDP() {
    if (!this.VM.isLoginValid) return;

    const c = window.confirm($localize`Voulez-vous réinitialiser votre mot de passe ?`);
    if (!c) return;

    this.action = $localize`Réinitialiser le mot de passe`;
    const errorService = ErrorService.instance;

    this.login_serv_nest
      .reinit_mdp(this.VM.compte.login)
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

  goCreateAccount() {
    if (!this.canCreateAccount) return;

    this.router.navigate(['/creer-compte'], {
      queryParams: { projectId: this.requestedProjectId },
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
      this.navigateAfterProjectSelection();
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

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}

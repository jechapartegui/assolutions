import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
import { AdherentStore } from '../../store/adherent.store';
import { MenuStore } from '../../store/menu.store';

@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  @Output() loggedIn = new EventEmitter<void>();
  VM: Login_VM = new Login_VM();
  action: string;

  projets: ProjetView[] | null = null;
  projets_select: ProjetView | null = null;

  selectedLogin = false;
  showPassword = false;

  resetToken: string | null = null;
resetMode = false;
newPassword = '';
newPasswordConfirm = '';

  /** Projet demandé depuis un lien externe : /login?context=CREATE&project=123 */
  requestedProjectId: number | null = null;
  requestedProject: any = null;

  @Input() context: 'REINIT' | 'ACTIVATION' | 'SEANCE' | 'MENU' | 'ESSAI' | 'CREATE' = 'MENU';
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
    public store: AppStore,
    private adherentStore: AdherentStore,
    private menuStore: MenuStore,
  ) {
    this.VM.compte.login = environment.defaultlogin ?? '';
    this.VM.compte.password = environment.defaultpassword ?? '';
    this.validateLogin();
  }

async ngOnInit(): Promise<void> {
  this.action = $localize`Chargement de la page`;
  const errorService = ErrorService.instance;

  const initialContext = this.context ?? 'MENU';
  const params = this.route.snapshot.queryParams;

  if ('context' in params) {
    try {
      this.context = params['context'];
      console.log(`Context de connexion : ${this.context}`);
    } catch (error) {
      const o = errorService.CreateError(
        this.action,
        $localize`Erreur sur la requête`
      );
      errorService.emitChange(o);
      await this.router.navigate(['/login']);
      return;
    }
  } else {
    this.context = initialContext;
  }

  if (params['user']) {
    this.VM.compte.login = String(params['user']).trim().toLowerCase();
    this.validateLogin();
  }

  this.requestedProjectId = this.readProjectIdFromParams(params);

  switch (this.context) {
    case 'ACTIVATION':
      await this.handleActivationLink(params);
      return;

    case 'REINIT':
      await this.handleResetPasswordLink(params);
      return;

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
}private activationProcessingKey: string | null = null;
private activationDoneKey: string | null = null;
private async handleActivationLink(params: any): Promise<void> {
  const errorService = ErrorService.instance;
  this.action = $localize`Activer le compte`;

  const token = params['token'];
  const user = params['user'];

  if (!token || !user) {
    const o = errorService.CreateError(
      this.action,
      $localize`Lien d'activation incomplet`
    );
    errorService.emitChange(o);

    await this.router.navigate(['/login'], {
      replaceUrl: true,
    });

    return;
  }

  const login = String(user).trim().toLowerCase();
  const activationKey = `${login}|${token}`;

  if (
    this.activationProcessingKey === activationKey ||
    this.activationDoneKey === activationKey
  ) {
    return;
  }

  this.activationProcessingKey = activationKey;
  this.loading = true;

  try {
    await this.compte_serv.check_token(login, token);

    this.activationDoneKey = activationKey;

    this.resetMode = false;
    this.resetToken = null;
    this.newPassword = '';
    this.newPasswordConfirm = '';
    this.selectedLogin = false;
    this.VM.mdp_requis = false;
    this.VM.compte.login = login;
    this.validateLogin();

    const o = errorService.OKMessage(
      $localize`Compte activé. Vous pouvez maintenant vous connecter.`
    );
    errorService.emitChange(o);

    await this.router.navigate(['/login'], {
      queryParams: {
        user: login,
        activated: 1,
      },
      replaceUrl: true,
    });
  } catch (error: any) {
    const o = errorService.CreateError(
      this.action,
      error?.message ?? $localize`Lien d'activation invalide ou expiré`
    );
    errorService.emitChange(o);

    await this.router.navigate(['/login'], {
      replaceUrl: true,
    });
  } finally {
    this.activationProcessingKey = null;
    this.loading = false;
  }
}

private async handleResetPasswordLink(params: any): Promise<void> {
  const errorService = ErrorService.instance;
  this.action = $localize`Réinitialiser le mot de passe`;

  const token = params['token'];
  const user = params['user'];

  if (!token || !user) {
    const o = errorService.CreateError(
      this.action,
      $localize`Lien de réinitialisation incomplet`
    );
    errorService.emitChange(o);
    this.router.navigate(['/login']);
    return;
  }

  this.loading = true;

  try {
    await this.login_serv_nest.checkResetToken(user, token);

    this.VM.compte.login = String(user).trim().toLowerCase();
    this.resetToken = token;
    this.resetMode = true;
    this.VM.mdp_requis = false;
    this.selectedLogin = true;
    this.libelle_titre = $localize`Choisissez votre nouveau mot de passe`;
  } catch (error: any) {
    const o = errorService.CreateError(
      this.action,
      error?.message ?? $localize`Lien invalide ou expiré`
    );
    errorService.emitChange(o);
    this.router.navigate(['/login']);
  } finally {
    this.loading = false;
  }
}

  async ValiderNouveauMotDePasse(): Promise<void> {
  const errorService = ErrorService.instance;
  this.action = $localize`Définir le mot de passe`;

  if (!this.resetToken) return;

  if (this.newPassword !== this.newPasswordConfirm) {
    const o = errorService.CreateError(this.action, $localize`Les mots de passe ne correspondent pas`);
    errorService.emitChange(o);
    return;
  }

const cleanPassword = this.newPassword?.trim() ?? '';

if (cleanPassword.length > 0) {
  this.validatePassword(cleanPassword);

  if (!this.VM.isPasswordValid) {
    const o = errorService.CreateError(
      this.action,
      $localize`Le mot de passe doit contenir au moins 8 caractères et un nombre`
    );
    errorService.emitChange(o);
    return;
  }
}

  try {
  await this.login_serv_nest.setPasswordWithToken(
  this.VM.compte.login,
  this.resetToken,
  cleanPassword
);

    const o = errorService.OKMessage(
  $localize`Mot de passe enregistré. Vous pouvez maintenant vous connecter.`
);
errorService.emitChange(o);

window.location.href = '/login';
 


  } catch (error: any) {
    const o = errorService.CreateError(this.action, error?.message ?? $localize`Erreur inconnue`);
    errorService.emitChange(o);
  }
}

  private readProjectIdFromParams(params: any): number | null {
    const raw = params['projectId'] ?? params['project'] ?? params['projetId'] ?? params['idProjet'] ?? params['id'];
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
        error?.message ?? $localize`Projet introuvable`,
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

  get hasNoProject(): boolean {
    return !!this.projets && this.projets.length === 0;
  }

  get hasManyProjects(): boolean {
    return !!this.projets && this.projets.length > 1;
  }

  validateLogin() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.VM.isLoginValid = emailRegex.test(this.VM.compte.login ?? '');
    this.valide();
  }

  validatePassword(mdp: string) {
    const value = mdp ?? '';
    const hasMinLength = value.length >= 8;
    const hasNumber = /\d/.test(value);
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

  private get redirectUrl(): string | null {
  return this.route.snapshot.queryParamMap.get('redirect');
}

private isSeanceRedirect(): boolean {
  const redirect = this.redirectUrl ?? '';
  return redirect.startsWith('/ma-seance');
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
  private getAutoProject(
  projectFromContext: ProjetView | null | undefined,
  projets: ProjetView[],
): ProjetView | null {
  if (projectFromContext) return projectFromContext;

  if (projets.length === 0) return null;

  if (projets.length === 1) return projets[0];

  const projetsAvecDroits = projets.filter(p =>
    !!p.rights?.adherent ||
    !!p.rights?.prof 
  );

  return projetsAvecDroits.length === 1 ? projetsAvecDroits[0] : null;
}

  private async openSession(mr: MeResponse): Promise<void> {
    if(mr.mode ==="ADMIN") {
      if(!mr.projects || mr.projects.length === 0 || mr.projects.length > 1) {
        const errorService = ErrorService.instance;
        const o = errorService.CreateError(this.action, $localize`Aucun projet associé au compte`);
        errorService.emitChange(o);
        return;
      }
       const s: Session = {
        token: mr.token,
        mode: this.VM.mode,
        compte: mr.compte,
        projects: mr.projects,
        selectedProjectId: mr.projects[0].id,
        rights: mr.projects[0].rights
      };
        await this.store.setSession(s);

        this.resetProjectCaches();
        this.store.selectProject(mr.projects[0].id);
        this.navigateAfterProjectSelection();
      return;
    }
    const errorService = ErrorService.instance;
    this.VM.compte = mr.compte;
    this.action = $localize`Lister les projets associés au compte`;

    try {
      const projets = await this.adhesion_serv.get();
      this.VM.projets = projets;

      const projectFromContext = this.findRequestedProject(projets);
      
      const autoProject = this.getAutoProject(projectFromContext, projets);
      
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
        this.resetProjectCaches();
        this.store.selectProject(autoProject.id);
        this.navigateAfterProjectSelection();
        return;
      }

      if (projets.length > 1) {
        this.projets = projets;
        this.projets_select = projectFromContext;
        return;
      }

      this.projets = [];
      this.projets_select = null;
      const o = errorService.OKMessage($localize`Connexion réussie`);
      errorService.emitChange(o);
      this.router.navigate(['/mon-compte']);
    } catch (error: any) {
      const o = errorService.CreateError(this.action, error?.message ?? $localize`Erreur inconnue`);
      errorService.emitChange(o);
      this.resetProjectCaches();
      this.store.clearSession();
      this.VM.check_login = { key: false, value: error?.message ?? '' };
    }
  }

  private findRequestedProject(projets: ProjetView[]): ProjetView | null {
    if (!this.requestedProjectId) return null;
    return projets.find((p) => Number(p.id) === Number(this.requestedProjectId)) ?? null;
  }

  private resetProjectCaches(): void {
    this.menuStore.reset();
    this.adherentStore.reset();
  }

private navigateAfterProjectSelection(): void {
  const redirect = this.redirectUrl;

  if (this.context === 'SEANCE' || this.isSeanceRedirect()) {
    this.store.updateSelectedMenu('MA-SEANCE');

    if (redirect) {
      this.router.navigateByUrl(redirect);
      return;
    }

    this.loggedIn.emit();
    return;
  }

  if (redirect) {
    this.router.navigateByUrl(redirect);
    return;
  }

  if (this.VM.mode === 'APPLI') {
    this.store.updateSelectedMenu('MENU');
    this.router.navigate(['/menu']);
  } else {
    this.store.updateSelectedMenu('MENU-ADMIN');
    this.router.navigate(['/menu-admin']);
  }
}
  private handleLoginError(error: Error): void {
    const errorService = ErrorService.instance;
    const o = errorService.CreateError(this.action, error.message);
    errorService.emitChange(o);
    this.resetProjectCaches();
    this.store.clearSession();
    this.VM.check_login = { key: false, value: error.message };
  }

  LogOut() {
    this.action = $localize`Se déconnecter`;
    const errorService = ErrorService.instance;
    this.resetProjectCaches();
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
      queryParams: { context: 'CREATE', projectId: this.requestedProjectId },
    });
  }

  SelectProject(event: any) {
    this.projets_select = this.projets?.find((x) => x.id == event) ?? null;
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
      this.resetProjectCaches();
      this.store.selectProject(this.projets_select.id);
      this.navigateAfterProjectSelection();
      const o = errorService.OKMessage(this.action);
      errorService.emitChange(o);
    } catch (err: any) {
      const msg = err?.message || 'Erreur inconnue';
      const o = errorService.CreateError(this.action, msg);
      errorService.emitChange(o);

      this.resetProjectCaches();
      this.store.clearSession();
      localStorage.removeItem('auth_token');
      await this.router.navigate(['/login']);
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}

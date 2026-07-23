import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ErrorService } from '../../services/error.service';
import { environment } from '../../environments/environment.prod';
import { Compte } from '@shared/lib/compte.interface';
import { CompteApiService } from '../../services/compte-api.service';
import { Login_VM } from '../../vm/login.vm';

@Component({
  standalone: false,
  selector: 'app-creer-compte',
  templateUrl: './creer-compte.component.html',
  styleUrls: ['./creer-compte.component.css'],
})
export class CreerCompteComponent implements OnInit {
  VM: Login_VM = new Login_VM();
  action = '';

  @Input() context = 'CREATE' as const;

  /**
   * Peut être fourni par le parent.
   * Sinon on lit project_id / projectId dans l’URL.
   */
  @Input() projectId: number | null = null;

  /**
   * Si true : on bloque la création si aucun projet n’est connu.
   * Pour la zone publique, oui.
   */
  @Input() requireProject = true;

  /**
   * Le parent peut réagir après création.
   * Par exemple : refresh session, navigation, affichage.
   */
  @Output() created = new EventEmitter<Compte>();

  libelle_titre = $localize`Saisissez une adresse mail pour créer un compte`;

  loading = false;
  rProject = { key: true, value: '' };

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly compteApi: CompteApiService
  ) {
    this.VM.compte.login = environment.defaultlogin;
    this.VM.compte.password = environment.defaultpassword;
  }

ngOnInit(): void {
  this.resolveProjectFromRoute();

  this.validateLogin();

  if (this.VM.mdp_requis) {
    this.validatePassword(this.VM.compte.password);
  }

  this.valide();
}
  private resolveProjectFromRoute(): void {
    if (this.projectId && this.projectId > 0) {
      return;
    }

    const raw =
      this.route.snapshot.queryParamMap.get('project_id') ??
      this.route.snapshot.queryParamMap.get('projectId') ??
      this.route.snapshot.queryParamMap.get('projet_id') ??
      this.route.snapshot.queryParamMap.get('projetId');

    const id = Number(raw);

    this.projectId = Number.isFinite(id) && id > 0 ? id : null;
  }

  get hasProject(): boolean {
    return !this.requireProject || Number(this.projectId) > 0;
  }

  validateLogin(): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.VM.isLoginValid = emailRegex.test((this.VM.compte.login ?? '').trim());
    this.valide();
  }

  validatePassword(mdp: string): void {
    const value = mdp ?? '';
    const hasMinLength = value.length >= 8;
    const hasNumber = /\d/.test(value);
    this.VM.isPasswordValid = hasMinLength && hasNumber;
    this.valide();
  }

  valide(): void {
    this.rProject = { key: true, value: '' };

    if (this.requireProject && !Number(this.projectId)) {
      this.rProject = {
        key: false,
        value: $localize`Impossible de créer un compte sans projet associé.`,
      };
    }

    if (this.VM.mdp_requis) {
      this.VM.isValid =
        this.VM.isLoginValid &&
        this.VM.isPasswordValid &&
        this.rProject.key &&
        !this.loading;
    } else {
      this.VM.isValid =
        this.VM.isLoginValid &&
        this.rProject.key &&
        !this.loading;
    }
  }

  togglePasswordRequired(checked: boolean): void {
    this.VM.mdp_requis = checked;

    if (!checked) {
      this.VM.compte.password = '';
      this.VM.isPasswordValid = true;
    } else {
      this.VM.isPasswordValid = false;
    }

    this.valide();
  }

  async CreerCompte(): Promise<void> {
    this.action = $localize`Créer un compte`;
    const errorService = ErrorService.instance;

    this.validateLogin();
    this.valide();

    if (!this.VM.isLoginValid) {
      errorService.emitChange(
        errorService.CreateError(this.action, $localize`Email invalide`)
      );
      return;
    }

    if (this.VM.mdp_requis && !this.VM.isPasswordValid) {
      errorService.emitChange(
        errorService.CreateError(this.action, $localize`Mot de passe invalide`)
      );
      return;
    }

    if (this.requireProject && !this.projectId) {
      errorService.emitChange(
        errorService.CreateError(
          this.action,
          $localize`Aucun projet n’est associé à cette création de compte.`
        )
      );
      return;
    }

    const msg = this.VM.mdp_requis
      ? $localize`Voulez-vous confirmer la création d'un compte avec mot de passe ?`
      : $localize`Voulez-vous confirmer la création d'un compte sans mot de passe ?`;

    const ok = window.confirm(msg);
    if (!ok) return;

    this.loading = true;
    this.valide();

    try {
      const compte = await this.compteApi.registerWithProject({
        email: this.VM.compte.login.trim().toLowerCase(),
        password: this.VM.mdp_requis ? this.VM.compte.password : null,
        mdp_requis: this.VM.mdp_requis,
        project_id: Number(this.projectId),
      });

      this.created.emit(compte);

      errorService.emitChange(errorService.OKMessage(this.action));

      this.router.navigate(['/login'], {
        queryParams: {
          user: this.VM.compte.login.trim().toLowerCase(),
          created: 1,
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : $localize`Erreur inconnue`;

      errorService.emitChange(
        errorService.CreateError(this.action, message)
      );
    } finally {
      this.loading = false;
      this.valide();
    }
  }

  RetourLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { user: this.VM.compte.login },
    });
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;

    if (this.VM.mdp_requis) {
      this.validatePassword(this.VM.compte.password);
    }

    if (this.VM.isValid) {
      this.CreerCompte();
    }
  }
}
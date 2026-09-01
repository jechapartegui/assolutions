import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Compte } from '@shared/lib/compte.interface';

import { environment } from '../../environments/environment.prod';
import { ApiError } from '../../services/api-client.service';
import { CompteApiService } from '../../services/compte-api.service';
import { ErrorService } from '../../services/error.service';
import { ProjectApiService } from '../../services/project-api.service';
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
  @Input() projectId: number | null = null;
  @Input() requireProject = true;
  @Output() created = new EventEmitter<Compte>();

  libelle_titre = $localize`Saisissez une adresse mail pour créer un compte`;
  loading = false;
  projectLoading = false;
  projectLoadFailed = false;
  projectName = '';
  rProject = { key: true, value: '' };

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly compteApi: CompteApiService,
    private readonly projectApi: ProjectApiService
  ) {
    this.VM.compte.login = environment.defaultlogin;
    this.VM.compte.password = environment.defaultpassword;
  }

  ngOnInit(): void {
    this.resolveProjectFromRoute();
    void this.loadProjectName();
    this.validateLogin();
    if (this.VM.mdp_requis) this.validatePassword(this.VM.compte.password);
    this.valide();
  }

  private resolveProjectFromRoute(): void {
    if (this.projectId && this.projectId > 0) return;
    const raw =
      this.route.snapshot.queryParamMap.get('project_id') ??
      this.route.snapshot.queryParamMap.get('projectId') ??
      this.route.snapshot.queryParamMap.get('projet_id') ??
      this.route.snapshot.queryParamMap.get('projetId');
    const id = Number(raw);
    this.projectId = Number.isFinite(id) && id > 0 ? id : null;
  }

  private async loadProjectName(): Promise<void> {
    const id = Number(this.projectId);
    this.projectName = '';
    this.projectLoadFailed = false;

    if (!id) return;

    this.projectLoading = true;
    try {
      const project = await this.projectApi.getPublic(id);
      this.projectName = (project?.nom ?? '').trim();
      this.projectLoadFailed = !this.projectName;
    } catch {
      this.projectLoadFailed = true;
    } finally {
      this.projectLoading = false;
    }
  }

  get hasProject(): boolean {
    return !this.requireProject || Number(this.projectId) > 0;
  }

  validateLogin(): void {
    this.VM.isLoginValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      (this.VM.compte.login ?? '').trim()
    );
    this.valide();
  }

  validatePassword(password: string): void {
    const value = password ?? '';
    this.VM.isPasswordValid = value.length >= 8 && /\d/.test(value);
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
    this.VM.isValid =
      this.VM.isLoginValid &&
      (!this.VM.mdp_requis || this.VM.isPasswordValid) &&
      this.rProject.key &&
      !this.loading;
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
    const errors = ErrorService.instance;
    this.validateLogin();
    this.valide();

    if (!this.VM.isLoginValid) {
      errors.emitChange(errors.CreateError(this.action, $localize`Email invalide`));
      return;
    }
    if (this.VM.mdp_requis && !this.VM.isPasswordValid) {
      errors.emitChange(errors.CreateError(this.action, $localize`Mot de passe invalide`));
      return;
    }
    if (this.requireProject && !this.projectId) {
      errors.emitChange(
        errors.CreateError(
          this.action,
          $localize`Aucun projet n’est associé à cette création de compte.`
        )
      );
      return;
    }

    const confirmed = window.confirm(
      this.VM.mdp_requis
        ? $localize`Voulez-vous confirmer la création d'un compte avec mot de passe ?\n\nAttention : le mail d’activation peut arriver dans vos spams ou courriers indésirables.`
        : $localize`Voulez-vous confirmer la création d'un compte sans mot de passe ?\n\nAttention : le mail d’activation peut arriver dans vos spams ou courriers indésirables.`
    );
    if (!confirmed) return;

    this.loading = true;
    this.valide();
    const email = this.VM.compte.login.trim().toLowerCase();

    try {
      const compte = await this.compteApi.registerWithProject({
        email,
        password: this.VM.mdp_requis ? this.VM.compte.password : null,
        mdp_requis: this.VM.mdp_requis,
        project_id: Number(this.projectId),
      });

      this.created.emit(compte);
      errors.emitChange(
        errors.OKMessage(
          this.action,
          $localize`Compte créé. Un mail d’activation a été envoyé à ${email}. Pensez à vérifier vos spams ou courriers indésirables.`
        )
      );
      this.router.navigate(['/login'], {
        queryParams: { user: email, created: 1, activationMail: 1 },
      });
    } catch (error: unknown) {
      const details = error instanceof ApiError ? (error.details as any) : null;
      if (
        error instanceof ApiError &&
        error.code === 'ACCOUNT_ALREADY_EXISTS' &&
        details?.mail_actif === false
      ) {
        await this.compteApi.resendActivation(email);
        errors.emitChange(
          errors.OKMessage(
            this.action,
            $localize`Ce compte existait déjà mais n’était pas activé. Un nouveau mail d’activation a été envoyé à ${email}. Pensez à vérifier vos spams ou courriers indésirables.`
          )
        );
        this.router.navigate(['/login'], {
          queryParams: { user: email, activationMail: 1 },
        });
        return;
      }
      errors.emitChange(errors.CreateError(this.action, error));
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
    if (this.VM.mdp_requis) this.validatePassword(this.VM.compte.password);
    if (this.VM.isValid) void this.CreerCompte();
  }
}

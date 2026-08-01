import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { InscriptionSaisonProjetVm } from '@shared/lib/inscription-saison.interface';
import { Project } from '@shared/lib/project.interface';

import { AuthApiService } from '../../services/auth-api.service';
import { ErrorService } from '../../services/error.service';
import { InscriptionSaisonApiService } from '../../services/inscription-saison-api.service';
import { LoginProjectApiService } from '../../services/login-projet-api.service';
import { PersonneApiService } from '../../services/personne-api.service';
import { ProjectApiService } from '../../services/project-api.service';
import { AppStore } from '../app.store';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  selector: 'app-mon-compte',
  templateUrl: './mon-compte.component.html',
  styleUrls: ['./mon-compte.component.css'],
})
export class MonCompteComponent {
  readonly store = inject(AppStore);

  private readonly router = inject(Router);
  private readonly projectApi = inject(ProjectApiService);
  private readonly personneApi = inject(PersonneApiService);
  private readonly loginProjectApi = inject(LoginProjectApiService);
  private readonly inscriptionSaisonApi = inject(InscriptionSaisonApiService);
  private readonly authApiService = inject(AuthApiService);

  action = '';
  loading = false;
  joinToken = '';
  publicProjects: Project[] = [];
  personnes: any[] = [];
  personneInscriptionsById = new Map<number, InscriptionSaisonProjetVm[]>();

  selectedProject = computed(() => this.store.selectedProject?.() ?? null);
  projets = computed(() => this.store.projects?.() ?? []);
  hasProjects = computed(() => this.projets().length > 0);

  get publicProjectsToJoin(): Project[] {
    const joinedIds = new Set(this.projets().map((project: any) => Number(project.id)));
    return this.publicProjects.filter((project) => !joinedIds.has(Number(project.id)));
  }

  async ngOnInit(): Promise<void> {
    await this.loadPage();
  }

  getInscriptionsForPersonne(personneId: number): InscriptionSaisonProjetVm[] {
    return this.personneInscriptionsById.get(Number(personneId)) ?? [];
  }

  canDeletePersonne(personne: any): boolean {
    if (!personne?.id) return false;
    return this.getInscriptionsForPersonne(personne.id).length === 0;
  }

  async loadPage(): Promise<void> {
    this.loading = true;
    try {
      await this.loadPublicProjects();
      await this.loadPersonnes();
      await this.loadInscriptionsPersonnes();
    } finally {
      this.loading = false;
    }
  }

  enterProject(project: any): void {
    if (!project) return;
    this.store.selectProject(Number(project.id));
    this.router.navigate(['/menu']);
  }

  async joinPublicProject(project: Project): Promise<void> {
    if (!project?.id) return;

    await this.loginProjectApi.create({
      login_id: this.store.session().compte.id,
      project_id: project.id,
    });

    await this.loadPage();
  }

  async joinWithToken(): Promise<void> {
    const token = this.joinToken.trim();
    if (!token) return;

    await this.loginProjectApi.joinWithToken(token);
    this.joinToken = '';
    await this.loadPage();
  }

  addPersonne(): void {
    this.router.navigate(['/adherent'], {
      queryParams: {
        context: 'MON_COMPTE',
        action: 'CREATE',
      },
    });
  }

  editPersonne(personne: any): void {
    if (!personne?.id) return;

    this.router.navigate(['/adherent'], {
      queryParams: {
        context: 'MON_COMPTE',
        id: personne.id,
      },
    });
  }

  async deletePersonne(personne: any): Promise<void> {
    if (!this.canDeletePersonne(personne)) return;

    const ok = window.confirm(
      $localize`Supprimer cette personne ? Cette action est possible car elle n'a aucune inscription.`,
    );
    if (!ok) return;

    await this.personneApi.remove(personne.id);
    await this.loadPage();
  }

  changePassword(): void {
    this.router.navigate(['/reinit-mdp']);
  }

  reinitPassword(): void {
    const confirmed = window.confirm(
      $localize`Voulez-vous réinitialiser votre mot de passe ?`,
    );
    if (!confirmed) return;

    this.action = $localize`Réinitialiser le mot de passe`;
    const errorService = ErrorService.instance;

    this.authApiService
      .reinit_mdp(this.store.session().compte.login)
      .then((ok) => {
        const notification = ok
          ? errorService.OKMessage(this.action)
          : errorService.UnknownError(this.action);
        errorService.emitChange(notification);
      })
      .catch((error: Error) => {
        const notification = errorService.CreateError(this.action, error.message);
        errorService.emitChange(notification);
        this.loading = false;
      });
  }

  private async loadInscriptionsPersonnes(): Promise<void> {
    const ids = this.personnes
      .map((personne) => Number(personne.id))
      .filter((id) => Number.isFinite(id) && id > 0);

    this.personneInscriptionsById.clear();
    if (!ids.length) return;

    const rows = await this.inscriptionSaisonApi.listByPersonnes(ids);
    for (const row of rows) {
      const key = Number(row.personne_id);
      const current = this.personneInscriptionsById.get(key) ?? [];
      current.push(row);
      this.personneInscriptionsById.set(key, current);
    }
  }

  private async loadPublicProjects(): Promise<void> {
    this.publicProjects = await this.projectApi.listPublicProjects();
  }

  private async loadPersonnes(): Promise<void> {
    this.personnes = await this.personneApi.listMine();
  }
}

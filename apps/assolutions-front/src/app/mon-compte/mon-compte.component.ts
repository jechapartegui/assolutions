
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '../app.store';
import { Project } from '@shared/lib/project.interface';
import { ProjectApiService } from '../../services/project-api.service';
import { PersonneApiService } from '../../services/personne-api.service';
import { LoginProjectApiService } from '../../services/login-projet-api.service';
import { InscriptionSaisonApiService } from '../../services/inscription-saison-api.service';
import { InscriptionSaisonProjetVm } from '@shared/lib/inscription-saison.interface';
import { ErrorService } from '../../services/error.service';
import { AuthApiService } from '../../services/auth-api.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-mon-compte',
  templateUrl: './mon-compte.component.html',
  styleUrls: ['./mon-compte.component.css'],
})
export class MonCompteComponent {
  readonly store = inject(AppStore);
  private readonly router = inject(Router);
  private readonly projectapi = inject(ProjectApiService);
private readonly personneapi  = inject(PersonneApiService);
private readonly loginProjectApi = inject(LoginProjectApiService);
private readonly inscriptionSaisonApi = inject(InscriptionSaisonApiService);
private readonly authApiService = inject(AuthApiService);
action = '';

personneInscriptionsById = new Map<number, InscriptionSaisonProjetVm[]>();

get publicProjectsToJoin(): Project[] {
  const joinedIds = new Set(this.projets().map((p: any) => Number(p.id)));
  return this.publicProjects.filter((p) => !joinedIds.has(Number(p.id)));
}

getInscriptionsForPersonne(personneId: number): InscriptionSaisonProjetVm[] {
  return this.personneInscriptionsById.get(Number(personneId)) ?? [];
}

canDeletePersonne(personne: any): boolean {
  if (!personne?.id) return false;
  return this.getInscriptionsForPersonne(personne.id).length === 0;
}

  loading = false;
    public  joinToken = '';

  // TODO brancher service projet public
  publicProjects: Project[] = [];

  // TODO brancher service personne compte
  personnes: any[] = [];

  selectedProject = computed(() => this.store.selectedProject?.() ?? null);
  projets = computed(() => this.store.projects?.() ?? []);

  hasProjects = computed(() => this.projets().length > 0);

  async ngOnInit(): Promise<void> {
    await this.loadPage();
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
private async loadInscriptionsPersonnes(): Promise<void> {
  const ids = this.personnes
    .map((p) => Number(p.id))
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
    this.publicProjects = await this.projectapi.listPublicProjects();
  }

  private async loadPersonnes(): Promise<void> {
    this.personnes = await this.personneapi.listMine();
  }


  enterProject(project: any): void {
    if (!project) return;

    if (this.store.selectProject) {
      this.store.selectProject(project);
    }

    this.router.navigate(['/menu']);
  }

async joinPublicProject(project: Project): Promise<void> {
  if (!project?.id) return;

  await this.loginProjectApi.create({
    login_id: this.store.session().compte.id,
    project_id: project.id,
  });

 // await this.store.refreshAdhesion?.();
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
    $localize`Supprimer cette personne ? Cette action est possible car elle n'a aucune inscription.`
  );

  if (!ok) return;

  await this.personneapi.remove(personne.id);
  await this.loadPage();
}
  changePassword(): void {
 this.router.navigate(['/reinit-mdp']);
  }

reinitPassword(): void {
 
     const c = window.confirm($localize`Voulez-vous réinitialiser votre mot de passe ?`);
     if (!c) return;
 
     this.action = $localize`Réinitialiser le mot de passe`;
     const errorService = ErrorService.instance;
 
     this.authApiService
       .reinit_mdp(this.store.session().compte.login)
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
}
import { computed, Injectable, signal } from '@angular/core';
import { ProjetView, Session } from '@shared/index';

export type MenuType =
  | 'ADHERENT' | 'COURS' | 'SEANCE' | 'GROUPE' | 'SAISON' | 'LIEU'
  | 'MENU' | 'MENU-ADMIN' | 'COMPTE' | 'PROF' | 'STOCK' | 'SUIVIMAIL' | 'PROJETINFO'
  | 'PROJETMAIL' | 'COMPTA' | 'CB' | 'FACTURE' | 'ENVOIMAIL'
  | 'ADMINISTRATEUR' | 'TDB' | 'TRANSACTION' | 'LISTE_VALEUR';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  readonly session = signal<Session | null>(null);
  readonly selectedMenu = signal<MenuType>('MENU');

  readonly publicSaisonActiveId = signal<number | null>(null);
  readonly publicProjetId = signal<number | null>(null);

  private readonly _language = signal(localStorage.getItem('language') ?? 'fr');

  readonly language = computed(() => this._language());
  readonly isLoggedIn = computed(() => !!this.session());
  readonly mode = computed(() => this.session()?.mode ?? 'APPLI');
  readonly compte = computed(() => this.session()?.compte ?? null);
  readonly projects = computed(() => this.session()?.projects ?? []);

  readonly selectedProject = computed(() => {
    const s = this.session();
    if (!s?.selectedProjectId) return null;
    return s.projects.find((p) => p.id === s.selectedProjectId) ?? null;
  });

  readonly selectedProjectId = computed(() => {
    const s = this.session();
    if (!s?.selectedProjectId) return this.publicProjetId();
    return s.selectedProjectId;
  });

  readonly projectId = computed(() => this.selectedProjectId());

  readonly saisonActiveId = computed(() => {
    const s = this.session();
    if (!s?.selectedProjectId) return this.publicSaisonActiveId();

    const projet = s.projects.find((p) => p.id === s.selectedProjectId);
    return projet?.saison_active?.id ?? this.publicSaisonActiveId();
  });

  readonly saisonActive = computed(() => {
    const s = this.session();
    if (!s?.selectedProjectId) return null;
    return s.projects.find((p) => p.id === s.selectedProjectId)?.saison_active ?? null;
  });

  readonly rights = computed(() => {
    const p = this.selectedProject();
    if (!p) return null;

    return {
      adherent: !!p.rights?.adherent,
      prof: !!p.rights?.prof,
      visible: !!p.rights?.visible,
    };
  });

  readonly isAdmin = computed(() => this.mode() === 'ADMIN');
  readonly isProf = computed(() => !!this.rights()?.prof);
  readonly isVisible = computed(() => !!this.rights()?.visible);
  readonly hasProjet = computed(() => (this.session()?.projects?.length ?? 0) > 0);

  setSession(s: Session): void {
    this.session.set(s);
    localStorage.setItem('auth_token', s.token);
    localStorage.setItem('auth_mode', s.mode);
    localStorage.setItem('selected_projet', String(s.selectedProjectId ?? ''));
  }

  clearSession(): void {
    this.session.set(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_mode');
    localStorage.removeItem('selected_projet');
  }

  setProjects(projects: ProjetView[]): void {
    const s = this.session();
    if (!s) return;
    this.session.set({ ...s, projects });
  }

  selectProject(projectId: number): void {
    const s = this.session();
    if (!s) return;
    this.session.set({ ...s, selectedProjectId: projectId });
    localStorage.setItem('selected_projet', String(projectId));
  }

  updateSaisonActive(saisonId: number): void {
    const s = this.session();
    if (!s || s.selectedProjectId == null) return;

    const projects = s.projects.map((p) => {
      if (p.id !== s.selectedProjectId) return p;
      if (!p.saison_active) return p;
      return { ...p, saison_active: { ...p.saison_active, id: saisonId } };
    });

    this.session.set({ ...s, projects });
  }

  setPublicContext(projectId: number | null, saisonId: number | null): void {
    this.publicProjetId.set(projectId);
    this.publicSaisonActiveId.set(saisonId);
  }

  setLanguage(lang: string): void {
    this._language.set(lang);
    localStorage.setItem('language', lang);
  }

  updateSelectedMenu(menu: MenuType): void {
    this.selectedMenu.set(menu);
  }
}
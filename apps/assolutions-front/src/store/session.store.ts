import { computed, Injectable, signal } from '@angular/core';
import { ProjetView, Session } from '@shared/index';

export type MenuType =
  | 'ADHERENT' | 'COURS' | 'SEANCE' | 'GROUPE'
  | 'SAISON' | 'LIEU' | 'MENU' | 'MENU-ADMIN'
  | 'COMPTE' | 'PROF' | 'STOCK' | 'SUIVIMAIL'
  | 'PROJETINFO' | 'PROJETMAIL' | 'COMPTA' | 'CB'
  | 'FACTURE' | 'ENVOIMAIL' | 'ADMINISTRATEUR'
  | 'TDB' | 'TRANSACTION' | 'LISTE_VALEUR' | 'MON_COMPTE' | 'PAIEMENT'

  // nouveaux menus admin
  | 'INSCRIPTION'
  | 'CONTRAT_PROF'
  | 'TRACES_PAIEMENT'
  | 'ADDINFO'
  | 'IMPORT_EXPORT'
  | 'DOCUMENT'
  | 'PHOTOS'
  | 'JOURNAL_ERREURS';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  readonly session = signal<Session | null>(null);
  readonly selectedMenu = signal<MenuType>('MENU');

  readonly publicSaisonActiveId = signal<number | null>(null);
  readonly publicProjetId = signal<number | null>(null);

  private readonly _language = signal(localStorage.getItem('language') ?? 'fr');

  readonly language = computed(() => this._language());
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly mode = computed(() => this.session()?.mode ?? 'APPLI');
  readonly compte = computed(() => this.session()?.compte ?? null);
  readonly projects = computed(() => this.session()?.projects ?? []);

  readonly selectedProjectId = computed(() => {
    const s = this.session();
    return s ? s.selectedProjectId ?? null : this.publicProjetId();
  });

  readonly selectedProject = computed(() => {
    const s = this.session();
    const selectedProjectId = this.selectedProjectId();

    if (!s || selectedProjectId == null) return null;

    return s.projects.find((p) => Number(p.id) === Number(selectedProjectId)) ?? null;
  });

  readonly projectId = computed(() => this.selectedProjectId());

  readonly saisonActiveId = computed(() => {
    const projet = this.selectedProject();
    return projet?.saison_active?.id ?? this.publicSaisonActiveId();
  });

  readonly saisonActive = computed(() => {
    return this.selectedProject()?.saison_active ?? null;
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
  readonly hasProjet = computed(() => this.projects().length > 0);

  setSession(session: Session): void {
    const selectedProjectId = this.cleanSelectedProjectId(
      session.selectedProjectId ?? null,
      session.projects,
    );

    const cleanSession: Session = {
      ...session,
      selectedProjectId,
    };

    this.session.set(cleanSession);

    if (cleanSession.token) {
      localStorage.setItem('auth_token', cleanSession.token);
    }

    localStorage.setItem('auth_mode', cleanSession.mode);

    if (selectedProjectId != null) {
      localStorage.setItem('selected_projet', String(selectedProjectId));
    } else {
      localStorage.removeItem('selected_projet');
    }
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

    const selectedProjectId = this.cleanSelectedProjectId(s.selectedProjectId ?? null, projects);

    this.session.set({
      ...s,
      projects,
      selectedProjectId,
    });

    if (selectedProjectId != null) {
      localStorage.setItem('selected_projet', String(selectedProjectId));
    } else {
      localStorage.removeItem('selected_projet');
    }
  }

  selectProject(projectId: number): void {
    const s = this.session();
    if (!s) return;

    const projectExists = s.projects.some((p) => Number(p.id) === Number(projectId));
    if (!projectExists) return;

    this.session.set({
      ...s,
      selectedProjectId: projectId,
    });

    localStorage.setItem('selected_projet', String(projectId));
  }

  updateSaisonActive(saisonId: number): void {
    const s = this.session();
    if (!s || s.selectedProjectId == null) return;

    const projects = s.projects.map((p) => {
      if (Number(p.id) !== Number(s.selectedProjectId)) return p;
      if (!p.saison_active) return p;

      return {
        ...p,
        saison_active: {
          ...p.saison_active,
          id: saisonId,
        },
      };
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

  private cleanSelectedProjectId(
    selectedProjectId: number | null,
    projects: ProjetView[],
  ): number | null {
    if (selectedProjectId != null) {
      const exists = projects.some((p) => Number(p.id) === Number(selectedProjectId));
      if (exists) return selectedProjectId;
    }

    if (projects.length === 1) {
      return projects[0].id;
    }

    return null;
  }
}
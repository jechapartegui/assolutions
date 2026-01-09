import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { catchError, from, map, Observable, of, switchMap } from 'rxjs';
import { AppStore } from './app.store';
import { LoginNestService } from '../services/login.nest.service';
import type { AppMode } from '@shared/lib/compte.interface';

type AuthRule = {
  /** ex: ['ADMIN'] ou ['APPLI'] */
  modes?: AppMode[];
  /** droits projet requis */
  requireProf?: boolean;
  requireEssai?: boolean;
  /** si tu veux forcer qu’un projet soit sélectionné */
  requireProject?: boolean;
};

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private meAlreadyTried = false;

  constructor(
    private loginService: LoginNestService,
    private store: AppStore,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    const token = localStorage.getItem('auth_token');

    // 1) Pas de token => pas connecté
    if (!token) {
      this.gotoLogin(state.url);
      return of(false);
    }

    // 2) Déjà connecté (store OK) => juste check access
    if (this.store.isLoggedIn()) {
      return of(this.checkAccess(route, state.url));
    }

    // 3) Token présent mais store vide => tenter /auth/me une seule fois
    if (this.meAlreadyTried) {
      this.gotoLogin(state.url);
      return of(false);
    }
    this.meAlreadyTried = true;

    return from(this.loginService.Me()).pipe(
      switchMap((me: any) => {
        // MeResponse: { compte, projects, token, mode }
        const selectedProjectId = this.restoreSelectedProjectId(me?.projects ?? []);

        // construire la Session attendue par ton store
        this.store.setSession({
          token: me.token ?? token,
          mode: me.mode ?? 'APPLI',
          compte: me.compte,
          projects: me.projects ?? [],
          selectedProjectId,
        } as any);

        // si on a un selectedProjectId on le force via API store (et localStorage)
        if (selectedProjectId) {
          this.store.selectProject(selectedProjectId);
        }

        // OK => check access
        const ok = this.checkAccess(route, state.url);

        if (!ok) {
          // tu peux choisir autre route: /menu ou /login selon ton UX
          this.router.navigate(['/menu']);
        }
        return of(ok);
      }),
      catchError((err) => {
        console.log('AuthGuard: /auth/me failed', err);
        this.store.clearSession();
        this.gotoLogin(state.url);
        return of(false);
      })
    );
  }

  private gotoLogin(redirectUrl: string) {
    this.router.navigate(['/login'], { queryParams: { redirect: redirectUrl } });
  }

  private restoreSelectedProjectId(projects: any[]): number | null {
    const raw = localStorage.getItem('selected_projet');
    const id = raw ? Number(raw) : NaN;

    // 1) si l’ID est valide et présent dans la liste => OK
    if (!Number.isNaN(id) && projects?.some((p: any) => p.id === id)) {
      return id;
    }

    // 2) sinon fallback : si un seul projet => auto-select
    if (projects?.length === 1) return projects[0].id;

    // 3) sinon : pas de projet sélectionné (user devra choisir dans l’UI)
    return null;
  }

  private checkAccess(route: ActivatedRouteSnapshot, currentUrl: string): boolean {
    const rule = (route.data?.['auth'] ?? {}) as AuthRule;

    // 1) mode
    if (rule.modes?.length) {
      const mode = this.store.mode(); // computed => AppMode
      if (!rule.modes.includes(mode as any)) return false;
    }

    // 2) projet requis
    if (rule.requireProject) {
      const hasProject = !!this.store.selectedProject();
      if (!hasProject) {
        // ici tu peux rediriger vers une page de choix projet si tu en as une
        // ex: this.router.navigate(['/projet']);
        return false;
      }
    }

    // 3) droits projet
    if (rule.requireProf && !this.store.isProf()) return false;
    if (rule.requireEssai && !this.store.canEssai()) return false;

    return true;
  }
}

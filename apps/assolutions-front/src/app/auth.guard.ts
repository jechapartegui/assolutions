import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { catchError, from, Observable, of, switchMap } from 'rxjs';
import { AppStore } from './app.store';
import { LoginNestService } from '../services/login.nest.service';
import type { AppMode } from '@shared/lib/compte.interface';

type AuthRule = {
  modes?: AppMode[];         // ex: ['ADMIN'] ou ['APPLI']
  requireProf?: boolean;
  requireEssai?: boolean;
  requireProject?: boolean;  // si tu veux forcer un projet sélectionné
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
      this.meAlreadyTried = false;
      this.gotoLogin(state.url);
      return of(false);
    }

    // 2) Déjà connecté (store OK) => juste check access
    if (this.store.isLoggedIn()) {
      const ok = this.checkAccess(route);
      if (!ok) this.gotoUnauthorizedHome();
      return of(ok);
    }

    // 3) Token présent mais store vide => tenter /auth/me une seule fois
    if (this.meAlreadyTried) {
      this.gotoLogin(state.url);
      return of(false);
    }
    this.meAlreadyTried = true;

    return from(this.loginService.Me()).pipe(
      switchMap((me: any) => {
        const selectedProjectId = this.restoreSelectedProjectId(me?.projects ?? []);

        this.store.setSession({
          token: token,
          mode: me.mode ?? 'APPLI',
          compte: me.compte,
          projects: me.projects ?? [],
          selectedProjectId,
        } as any);

        if (selectedProjectId) {
          this.store.selectProject(selectedProjectId);
        }

        const ok = this.checkAccess(route);
        if (!ok) this.gotoUnauthorizedHome();
        return of(ok);
      }),
      catchError((err) => {
        console.log('AuthGuard: /auth/me failed', err);
        this.store.clearSession();
        this.meAlreadyTried = false;
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

    if (!Number.isNaN(id) && projects?.some((p: any) => p.id === id)) return id;
    if (projects?.length === 1) return projects[0].id;

    return null;
  }

  private checkAccess(route: ActivatedRouteSnapshot): boolean {
    const rule = (route.data?.['auth'] ?? {}) as AuthRule;

    // mode
    if (rule.modes?.length) {
      const mode = this.store.mode();
      if (!rule.modes.includes(mode as any)) return false;
    }

    // projet requis
    if (rule.requireProject && !this.store.selectedProject()) return false;

    // droits
    if (rule.requireProf && !this.store.isProf()) return false;
    if (rule.requireEssai && !this.store.canEssai()) return false;

    return true;
  }

  private gotoUnauthorizedHome() {
    if (this.store.mode() === 'ADMIN') this.router.navigate(['/menu-admin']);
    else this.router.navigate(['/menu']);
  }
}

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { catchError, from, map, Observable, of, switchMap } from 'rxjs';
import { ProjetView } from '@shared/index';
import type { AppMode } from '@shared/lib/compte.interface';

import { AdhesionApiService } from '../services/adhesion-api.service';
import { getAuthToken } from '../services/auth-token.storage';
import { AuthApiService } from '../services/auth-api.service';
import { AppStore } from './app.store';

type AuthRule = {
  modes?: AppMode[];
  requireProf?: boolean;
  requireEssai?: boolean;
  requireProject?: boolean;
};

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private meAlreadyTried = false;

  constructor(
    private readonly loginService: AuthApiService,
    private readonly adherentService: AdhesionApiService,
    private readonly store: AppStore,
    private readonly router: Router,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean> {
    const token = getAuthToken();

    if (!token) {
      this.meAlreadyTried = false;
      this.gotoLogin(state.url);
      return of(false);
    }

    if (this.store.isLoggedIn()) {
      const ok = this.checkAccess(route);
      if (!ok) this.gotoUnauthorizedHome();
      return of(ok);
    }

    if (this.meAlreadyTried) {
      this.gotoLogin(state.url);
      return of(false);
    }

    this.meAlreadyTried = true;

    return from(this.loginService.me()).pipe(
      switchMap((mr): Observable<boolean> => {
        if (mr.mode === 'ADMIN') {
          if (!mr.projects || mr.projects.length !== 1) {
            this.store.clearSession();
            this.meAlreadyTried = false;
            this.gotoLogin(state.url);
            return of(false);
          }

          const project = mr.projects[0];
          this.store.setSession({
            token: mr.token ?? token,
            mode: 'ADMIN',
            compte: mr.compte,
            projects: mr.projects,
            selectedProjectId: project.id,
            rights: project.rights,
          });

          const ok = this.checkAccess(route);
          if (!ok) this.gotoUnauthorizedHome();
          return of(ok);
        }

        return from(this.adherentService.get() as Promise<ProjetView[]>).pipe(
          map((projects: ProjetView[]): boolean => {
            const selectedProjectId = this.restoreSelectedProjectId(projects);
            this.store.setSession({
              token: mr.token ?? token,
              mode: mr.mode,
              compte: mr.compte,
              projects,
              selectedProjectId,
              rights: projects.find((x) => x.id === selectedProjectId)?.rights ?? null,
            });

            const ok = this.checkAccess(route);
            if (!ok) this.gotoUnauthorizedHome();
            return ok;
          }),
        );
      }),
      catchError((): Observable<boolean> => {
        this.store.clearSession();
        this.meAlreadyTried = false;
        this.gotoLogin(state.url);
        return of(false);
      }),
    );
  }

  private restoreSelectedProjectId(projects: ProjetView[]): number | null {
    const raw = localStorage.getItem('selected_projet');
    const selectedProjectId = raw ? Number(raw) : NaN;

    if (
      !Number.isNaN(selectedProjectId) &&
      projects.some((p) => Number(p.id) === Number(selectedProjectId))
    ) {
      return selectedProjectId;
    }

    if (projects.length === 1) return projects[0].id;
    return null;
  }

  private checkAccess(route: ActivatedRouteSnapshot): boolean {
    const rule = (route.data?.['auth'] ?? {}) as AuthRule;

    if (rule.modes?.length) {
      const mode = this.store.mode();
      if (!rule.modes.includes(mode)) return false;
    }
    if (rule.requireProject && !this.store.selectedProject()) return false;
    if (rule.requireProf && !this.store.isProf()) return false;
    return true;
  }

  private gotoLogin(redirectUrl: string): void {
    this.router.navigate(['/login'], {
      queryParams: { redirect: redirectUrl },
    });
  }

  private gotoUnauthorizedHome(): void {
    if (this.store.mode() === 'ADMIN') {
      this.router.navigate(['/menu-admin']);
      return;
    }
    this.router.navigate(['/menu']);
  }
}

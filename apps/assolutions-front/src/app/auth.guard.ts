import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from "@angular/router";
import { catchError, from, map, Observable, of } from "rxjs";
import { AppStore } from "./app.store";
import { LoginNestService } from "../services/login.nest.service";
import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private meAlreadyTried = false;

  constructor(
    private loginService: LoginNestService,
    private store: AppStore,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {

    const token = localStorage.getItem('auth_token');
    console.log('AuthGuard canActivate, token=', token);
    // 1. Pas de token → pas connecté → login
    if (!token) {
      this.router.navigate(['/login'], { queryParams: { redirect: state.url } });
      return of(false);
    }

    // 2. On a déjà une session en mémoire → OK direct
    if (this.store.isLoggedIn()) {
      return of(true);
    }

    // 3. On a un token mais pas (encore) de session → on tente /auth/me
    if (!this.meAlreadyTried) {
      this.meAlreadyTried = true;

      return from(this.loginService.Me()).pipe(
        map(({ compte, projets }) => {
          this.store.login(compte);
          this.store.updateListeProjet(projets); // si tu as ça
          return true;
        }),
        catchError(() => {
            console.log('AuthGuard: /auth/me failed');
          // token invalide ou erreur → on nettoie et on envoie au login
          localStorage.removeItem('auth_token');
          
          this.router.navigate(['/login'], { queryParams: { redirect: state.url } });
          return of(false);
        })
      );
    }

    // 4. Si on arrive ici : on a déjà tenté Me() et ça n’a pas abouti → blocage
    this.router.navigate(['/login'], { queryParams: { redirect: state.url } });
    return of(false);
  }
}

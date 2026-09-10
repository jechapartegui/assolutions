import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { catchError, from, map, Observable, of } from 'rxjs';

import { OnboardingApiService } from '../services/onboarding-api.service';

/**
 * Tant que le socle obligatoire du club n'est pas initialisé, le centre de
 * pilotage renvoie vers l'assistant. Les écrans de configuration restent
 * accessibles depuis l'assistant afin de compléter chaque étape.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingCompleteGuard implements CanActivate {
  constructor(
    private readonly onboardingApi: OnboardingApiService,
    private readonly router: Router,
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return from(this.onboardingApi.status()).pipe(
      map((status) =>
        status.complete
          ? true
          : this.router.createUrlTree(['/onboarding']),
      ),
      catchError(() => of(this.router.createUrlTree(['/onboarding']))),
    );
  }
}

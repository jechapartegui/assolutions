import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { OnboardingApiService } from '../../services/onboarding-api.service';

@Component({
  selector: 'app-public-landing',
  templateUrl: './public-landing.component.html',
  styleUrls: ['./public-landing.component.css'],
  standalone: false,
})
export class PublicLandingComponent {
  clubName = '';
  activity = '';
  email = '';
  password = '';
  passwordConfirm = '';
  loading = false;
  error = '';
  success = '';

  constructor(
    private readonly onboardingApi: OnboardingApiService,
    private readonly router: Router,
  ) {}

  async submit(): Promise<void> {
    this.error = '';
    this.success = '';

    if (!this.clubName.trim() || !this.activity.trim() || !this.email.trim()) {
      this.error = 'Le nom du club, l’activité et l’adresse email sont obligatoires.';
      return;
    }
    if (this.password && this.password !== this.passwordConfirm) {
      this.error = 'Les mots de passe ne correspondent pas.';
      return;
    }
    if (this.password && (this.password.length < 8 || !/\d/.test(this.password))) {
      this.error = 'Le mot de passe doit contenir au moins 8 caractères et un chiffre.';
      return;
    }

    this.loading = true;
    try {
      const result = await this.onboardingApi.bootstrap({
        club_name: this.clubName.trim(),
        activity: this.activity.trim(),
        email: this.email.trim().toLowerCase(),
        password: this.password.trim() || null,
      });
      this.success = `Le club « ${result.project_name} » est créé. Un email d’activation vient d’être envoyé à ${result.email}.`;
    } catch (error: any) {
      this.error = error?.error?.message ?? error?.message ?? 'Impossible de créer le club pour le moment.';
    } finally {
      this.loading = false;
    }
  }

  login(): void {
    void this.router.navigate(['/login']);
  }
}

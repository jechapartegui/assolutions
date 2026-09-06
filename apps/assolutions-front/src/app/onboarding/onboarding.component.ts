import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OnboardingApiService, OnboardingStatus } from '../../services/onboarding-api.service';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css'],
  standalone: false,
})
export class OnboardingComponent implements OnInit {
  status: OnboardingStatus | null = null;
  loading = true;
  bankLoading = false;
  error = '';

  readonly steps = [
    { key: 'project', label: 'Projet', description: 'Complète les informations principales du club.', icon: 'fa-sliders', route: '/admin-projet', required: true },
    { key: 'saison', label: 'Saison', description: 'Crée au moins une saison pour structurer l’activité.', icon: 'fa-calendar', route: '/saison', required: true },
    { key: 'lieu', label: 'Lieu', description: 'Ajoute au moins un gymnase, terrain ou lieu d’activité.', icon: 'fa-location-dot', route: '/lieu', required: true },
    { key: 'groupe', label: 'Groupe', description: 'Crée au moins un groupe rattaché à une saison.', icon: 'fa-layer-group', route: '/groupe', required: true },
    { key: 'professeur', label: 'Professeur', description: 'Référence au moins un encadrant du club.', icon: 'fa-person-chalkboard', route: '/professeur', required: true },
    { key: 'contrat', label: 'Contrat professeur', description: 'Ajoute au moins un contrat pour un encadrant.', icon: 'fa-file-signature', route: '/contrat-prof', required: true },
    { key: 'mails', label: 'Emails du projet', description: 'Renseigne les modèles utilisés par les communications automatiques.', icon: 'fa-envelope-circle-check', route: '/projet-mail', required: true },
    { key: 'banque', label: 'Compte bancaire', description: 'Facultatif : ajoute un compte réel ou crée un compte par défaut.', icon: 'fa-building-columns', route: '/compte-bancaire', required: false },
  ] as const;

  constructor(
    private readonly api: OnboardingApiService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    void this.load();
  }

  get percent(): number {
    if (!this.status?.required_total) return 0;
    return Math.round((this.status.required_done / this.status.required_total) * 100);
  }

  isDone(key: typeof this.steps[number]['key']): boolean {
    return !!this.status?.steps?.[key];
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.status = await this.api.status();
    } catch (error: any) {
      this.error = error?.message ?? 'Impossible de charger l’état d’initialisation.';
    } finally {
      this.loading = false;
    }
  }

  open(route: string): void {
    void this.router.navigate([route], { queryParams: { retour: '/onboarding' } });
  }

  async createDefaultBank(): Promise<void> {
    this.bankLoading = true;
    this.error = '';
    try {
      await this.api.createDefaultBank();
      await this.load();
    } catch (error: any) {
      this.error = error?.message ?? 'Impossible de créer le compte bancaire par défaut.';
    } finally {
      this.bankLoading = false;
    }
  }

  finish(): void {
    void this.router.navigate(['/menu-admin']);
  }
}

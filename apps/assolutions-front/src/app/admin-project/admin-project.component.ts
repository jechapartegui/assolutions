import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { SaisonApiService } from '../../services/saison-api.service';
import {
  AdminProjectAccount,
  AdminProjectApiService,
  AdminProjectInfo,
  AdminProjectOverview,
  AdminProjectPerson,
} from '../../services/admin-project-api.service';
import { AppStore } from '../app.store';

type AdminProjectTab = 'PROJECT' | 'ACCOUNTS' | 'PEOPLE';

type ProjectDraft = {
  nom: string;
  login: string;
  public: boolean;
  date_debut: string;
  date_fin: string;
  activite: string;
  lang: string;
  couleur: string;
  contactJson: string;
  adresseJson: string;
};

type AccountDraft = {
  login: string;
  actif: boolean;
  mail_actif: boolean;
};

@Component({
  standalone: false,
  selector: 'app-admin-project',
  templateUrl: './admin-project.component.html',
  styleUrls: ['./admin-project.component.css'],
})
export class AdminProjectComponent implements OnInit {
  tab: AdminProjectTab = 'PROJECT';
  loading = false;
  saving = false;
  message = '';
  error = '';

  overview: AdminProjectOverview | null = null;
  accounts: AdminProjectAccount[] = [];
  people: AdminProjectPerson[] = [];
  saisons: any[] = [];

  projectDraft: ProjectDraft = this.emptyProjectDraft();
  accountSearch = '';
  personSearch = '';
  editingAccountId: number | null = null;
  accountDraft: AccountDraft | null = null;

  superCode = '';
  elevationToken: string | null = null;
  elevationExpiresAt = 0;

  registrationSeasonByPerson: Record<number, number> = {};

  constructor(
    public readonly store: AppStore,
    private readonly api: AdminProjectApiService,
    private readonly saisonApi: SaisonApiService,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    if (!this.store.selectedProjectId?.()) {
      await this.router.navigate(['/menu-admin']);
      return;
    }
    await this.reload();
  }

  get project(): AdminProjectInfo | null {
    return this.overview?.project ?? null;
  }

  get activeSeasonId(): number {
    return Number(this.store.saison_active_reelle_id?.() ?? 0);
  }

  get isElevated(): boolean {
    return !!this.elevationToken && this.elevationExpiresAt > Date.now();
  }

  get filteredAccounts(): AdminProjectAccount[] {
    const q = this.normalizeSearch(this.accountSearch);
    if (!q) return this.accounts;
    return this.accounts.filter((account) => {
      const haystack = [
        account.login,
        ...(account.people ?? []).flatMap((person) => [
          person.first_name,
          person.last_name,
          person.nickname ?? '',
        ]),
        ...(account.projects ?? []).map((project) => project.nom),
      ].join(' ');
      return this.normalizeSearch(haystack).includes(q);
    });
  }

  get filteredPeople(): AdminProjectPerson[] {
    const q = this.normalizeSearch(this.personSearch);
    if (!q) return this.people;
    return this.people.filter((person) =>
      this.normalizeSearch(
        `${person.first_name} ${person.last_name} ${person.nickname ?? ''} ${person.login}`,
      ).includes(q),
    );
  }

  async reload(): Promise<void> {
    this.loading = true;
    this.clearFeedback();
    try {
      const [overview, accounts, people, saisons] = await Promise.all([
        this.api.overview(),
        this.api.accounts(),
        this.api.people(),
        this.saisonApi.list(),
      ]);
      this.overview = overview;
      this.accounts = accounts ?? [];
      this.people = people ?? [];
      this.saisons = [...(saisons ?? [])].sort((a: any, b: any) =>
        String(b?.nom ?? '').localeCompare(String(a?.nom ?? '')),
      );
      this.projectDraft = this.toProjectDraft(overview.project);
      this.initializeRegistrationSeasons();
    } catch (error: any) {
      this.error = error?.message ?? 'Chargement de l’administration projet impossible.';
    } finally {
      this.loading = false;
    }
  }

  setTab(tab: AdminProjectTab): void {
    this.tab = tab;
    this.clearFeedback();
  }

  async saveProject(): Promise<void> {
    this.saving = true;
    this.clearFeedback();
    try {
      const contact = this.parseJsonField(this.projectDraft.contactJson, 'Contact');
      const adresse = this.parseJsonField(this.projectDraft.adresseJson, 'Adresse');
      const project = await this.api.updateProject({
        nom: this.projectDraft.nom.trim(),
        login: this.projectDraft.login.trim() || null,
        public: this.projectDraft.public,
        date_debut: this.projectDraft.date_debut || null,
        date_fin: this.projectDraft.date_fin || null,
        activite: this.projectDraft.activite.trim() || null,
        lang: this.projectDraft.lang.trim() || null,
        couleur: this.projectDraft.couleur.trim() || null,
        contact,
        adresse,
      });
      if (this.overview) this.overview = { ...this.overview, project };
      this.projectDraft = this.toProjectDraft(project);
      this.message = 'Informations du projet enregistrées.';
    } catch (error: any) {
      this.error = error?.message ?? 'Enregistrement du projet impossible.';
    } finally {
      this.saving = false;
    }
  }

  async unlockSuperAdmin(): Promise<void> {
    this.clearFeedback();
    if (!this.superCode.trim()) {
      this.error = 'Saisis le code Super Admin.';
      return;
    }
    try {
      const elevation = await this.api.elevate(this.superCode);
      this.elevationToken = elevation.token;
      this.elevationExpiresAt = elevation.expiresAt;
      this.superCode = '';
      this.message = 'Mode Super Admin activé temporairement.';
    } catch (error: any) {
      this.elevationToken = null;
      this.elevationExpiresAt = 0;
      this.error = error?.message ?? 'Code Super Admin incorrect.';
    }
  }

  lockSuperAdmin(): void {
    this.elevationToken = null;
    this.elevationExpiresAt = 0;
    this.superCode = '';
    this.message = 'Mode Super Admin désactivé.';
  }

  canManageAccount(account: AdminProjectAccount): boolean {
    return Number(account.project_count ?? 0) <= 1 || this.isElevated;
  }

  beginAccountEdit(account: AdminProjectAccount): void {
    if (!this.canManageAccount(account)) return;
    this.editingAccountId = account.id;
    this.accountDraft = {
      login: account.login,
      actif: !!account.actif,
      mail_actif: !!account.mail_actif,
    };
    this.clearFeedback();
  }

  cancelAccountEdit(): void {
    this.editingAccountId = null;
    this.accountDraft = null;
  }

  async saveAccount(account: AdminProjectAccount): Promise<void> {
    if (!this.accountDraft || this.editingAccountId !== account.id) return;
    this.saving = true;
    this.clearFeedback();
    try {
      const updated = await this.api.updateAccount(account.id, {
        ...this.accountDraft,
        elevation_token: this.isElevated ? this.elevationToken : null,
      });
      this.accounts = this.accounts.map((item) =>
        item.id === account.id ? { ...item, ...updated } : item,
      );
      this.people = this.people.map((person) =>
        person.compte === account.id
          ? {
              ...person,
              login: updated.login,
              compte_actif: updated.actif,
              mail_actif: updated.mail_actif,
            }
          : person,
      );
      this.cancelAccountEdit();
      this.message = 'Compte mis à jour.';
    } catch (error: any) {
      this.error = error?.message ?? 'Modification du compte impossible.';
    } finally {
      this.saving = false;
    }
  }

  async resetPassword(account: AdminProjectAccount): Promise<void> {
    if (!this.canManageAccount(account)) return;
    if (!window.confirm(`Envoyer un lien de réinitialisation à ${account.login} ?`)) return;
    this.clearFeedback();
    try {
      await this.api.resetPassword(
        account.id,
        this.isElevated ? this.elevationToken : null,
      );
      this.message = `Mail de réinitialisation envoyé à ${account.login}.`;
    } catch (error: any) {
      this.error = error?.message ?? 'Réinitialisation impossible.';
    }
  }

  async openPerson(person: { id: number }): Promise<void> {
    const seasonId = this.activeSeasonId || Number(this.saisons[0]?.id ?? 0);
    await this.router.navigate(['/adherent'], {
      queryParams: {
        id: person.id,
        context: 'PROJET',
        saisonId: seasonId || null,
        returnUrl: '/admin-projet',
      },
    });
  }

  async startRegistration(person: AdminProjectPerson): Promise<void> {
    if (person.archive) return;
    const seasonId = Number(this.registrationSeasonByPerson[person.id] ?? this.activeSeasonId);
    if (!seasonId || this.isRegistered(person, seasonId)) return;

    this.store.setConsultationSaison(
      seasonId === this.activeSeasonId ? null : seasonId,
    );
    await this.router.navigate(['/souscription'], {
      queryParams: { adminPersonId: person.id },
    });
  }

  onRegistrationSeasonChange(personId: number, value: string | number): void {
    const seasonId = Number(value);
    if (Number.isInteger(seasonId) && seasonId > 0) {
      this.registrationSeasonByPerson[personId] = seasonId;
    }
  }

  isRegistered(person: AdminProjectPerson, seasonId?: number): boolean {
    const target = Number(seasonId ?? this.registrationSeasonByPerson[person.id] ?? 0);
    return !!person.saisons?.some(
      (season) => Number(season.id) === target && season.active !== false,
    );
  }

  seasonLabel(season: any): string {
    const label = season?.nom ?? `Saison #${season?.id}`;
    return Number(season?.id) === this.activeSeasonId ? `${label} — active` : label;
  }

  displayPersonName(person: { first_name: string; last_name: string; nickname?: string | null }): string {
    const full = `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim();
    return person.nickname ? `${full} (${person.nickname})` : full;
  }

  projectNames(account: AdminProjectAccount): string {
    return (account.projects ?? []).map((project) => project.nom).join(' · ');
  }

  trackById(_: number, item: { id: number }): number {
    return item.id;
  }

  private initializeRegistrationSeasons(): void {
    const fallback = this.activeSeasonId || Number(this.saisons[0]?.id ?? 0);
    const next: Record<number, number> = {};
    for (const person of this.people) next[person.id] = fallback;
    this.registrationSeasonByPerson = next;
  }

  private toProjectDraft(project: AdminProjectInfo): ProjectDraft {
    return {
      nom: project?.nom ?? '',
      login: project?.login ?? '',
      public: !!project?.public,
      date_debut: this.toDateInput(project?.date_debut),
      date_fin: this.toDateInput(project?.date_fin),
      activite: project?.activite ?? '',
      lang: project?.lang ?? 'fr',
      couleur: project?.couleur ?? '',
      contactJson: this.prettyJson(project?.contact),
      adresseJson: this.prettyJson(project?.adresse),
    };
  }

  private emptyProjectDraft(): ProjectDraft {
    return {
      nom: '', login: '', public: false, date_debut: '', date_fin: '',
      activite: '', lang: 'fr', couleur: '', contactJson: '', adresseJson: '',
    };
  }

  private prettyJson(value: unknown): string {
    if (value == null) return '';
    try { return JSON.stringify(value, null, 2); } catch { return String(value); }
  }

  private parseJsonField(value: string, label: string): unknown {
    if (!value.trim()) return null;
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`${label} doit être un objet JSON.`);
      }
      return parsed;
    } catch (error: any) {
      if (error?.message?.includes('doit être')) throw error;
      throw new Error(`${label} : JSON invalide.`);
    }
  }

  private toDateInput(value: string | null | undefined): string {
    return value ? String(value).slice(0, 10) : '';
  }

  private normalizeSearch(value: string): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private clearFeedback(): void {
    this.message = '';
    this.error = '';
  }
}

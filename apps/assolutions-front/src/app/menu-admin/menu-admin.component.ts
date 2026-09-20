import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '../app.store';
import { SaisonApiService } from '../../services/saison-api.service';
import { BugReportApiService, BugReportSeverity } from '../../services/bug-report-api.service';
import { MenuType } from '../../store/session.store';

type AdminTile = {
  label: string;
  icon: string;
  menu: MenuType;
  route?: string;
  queryParams?: Record<string, any>;
  disabled?: boolean;
  hint?: string;
  action?: 'BUG_REPORT';
};

type AdminSection = {
  title: string;
  subtitle?: string;
  tiles: AdminTile[];
};

type BugReportForm = {
  title: string;
  description: string;
  screen: string;
  severity: BugReportSeverity;
  steps: string;
  expected: string;
  actual: string;
};

@Component({
  standalone: false,
  selector: 'app-menu-admin',
  templateUrl: './menu-admin.component.html',
  styleUrls: ['./menu-admin.component.css'],
})
export class MenuAdminComponent implements OnInit {
  saisons: any[] = [];
  selectedSaisonId: number | null = null;
  loadingSaisons = false;

  bugReportOpen = false;
  bugReportSending = false;
  bugReportSuccess = '';
  bugReportError = '';
  bugReport: BugReportForm = this.createEmptyBugReport();

  sections: AdminSection[] = [
    {
      title: $localize`:@@admin.seasonManagement.title:Gestion de la saison`,
      subtitle: $localize`:@@admin.seasonManagement.subtitle:Adhérents, groupes, cours et séances de la saison consultée`,
      tiles: [
        {
          label: $localize`:@@admin.members:Adhérents`,
          icon: 'fa-users',
          menu: 'ADHERENT',
          route: '/adherent',
          hint: $localize`:@@admin.membersHint:Rechercher, créer et mettre à jour les personnes du club`,
        },
        {
          label: $localize`:@@admin.sessions:Séances`,
          icon: 'fa-calendar-days',
          menu: 'SEANCE',
          route: '/seance',
          hint: $localize`:@@admin.sessionsHint:Consulter les séances, présences, essais et encadrants`,
        },
        {
          label: $localize`:@@admin.classes:Cours`,
          icon: 'fa-chalkboard-user',
          menu: 'COURS',
          route: '/cours',
          hint: $localize`:@@admin.classesHint:Organiser les séries récurrentes qui génèrent les séances`,
        },
        {
          label: $localize`:@@admin.groups:Groupes`,
          icon: 'fa-layer-group',
          menu: 'GROUPE',
          route: '/groupe',
          hint: $localize`:@@admin.groupsHint:Structurer les adhérents et les critères d’accès aux activités`,
        },
      ],
    },
    {
      title: $localize`:@@admin.registrationManagement.title:Gestion des inscriptions`,
      subtitle: $localize`:@@admin.registrationManagement.subtitle:Offres, dossiers, paiements et règles du parcours d’inscription`,
      tiles: [
        {
          label: $localize`:@@admin.registrationFees:Tarifs d'inscription`,
          icon: 'fa-tags',
          menu: 'INSCRIPTION',
          route: '/inscription',
          hint: $localize`:@@admin.registrationFeesHint:Configurer les offres, tarifs et conditions d’éligibilité`,
        },
        {
          label: $localize`:@@admin.registrationTracking:Suivi des inscriptions`,
          icon: 'fa-route',
          menu: 'TRACES_PAIEMENT',
          route: '/suivi-inscriptions',
          hint: $localize`:@@admin.registrationTrackingHint:Diagnostiquer les dossiers, paiements, événements et finalisations`,
        },
        {
          label: $localize`:@@admin.promoCodes:Codes promotionnels`,
          icon: 'fa-ticket',
          menu: 'INSCRIPTION',
          route: '/codes-promo',
          hint: $localize`:@@admin.promoCodesHint:Créer les réductions applicables aux offres d’inscription`,
        },
        {
          label: $localize`:@@admin.requirements:Exigences des dossiers`,
          icon: 'fa-list-check',
          menu: 'INSCRIPTION',
          route: '/exigences-dossier',
          hint: $localize`:@@admin.requirementsHint:Définir les pièces, consentements et validations obligatoires`,
        },
        {
          label: $localize`:@@admin.instructorContracts:Contrats professeurs`,
          icon: 'fa-file-signature',
          menu: 'CONTRAT_PROF',
          route: '/contrat-prof',
          hint: $localize`:@@admin.instructorContractsHint:Gérer les engagements et conditions des encadrants`,
        },
      ],
    },
    {
      title: $localize`:@@admin.finance.title:Finances`,
      subtitle: $localize`:@@admin.finance.subtitle:Budget, flux financiers, paiements, trésorerie et matériel`,
      tiles: [
        {
          label: $localize`:@@admin.financeDashboard:Tableau finance`,
          icon: 'fa-chart-pie',
          menu: 'COMPTA',
          route: '/comptabilite',
          queryParams: { vue: 'DASHBOARD' },
          hint: $localize`:@@admin.financeDashboardHint:Voir rapidement la situation financière de la saison`,
        },
        {
          label: $localize`:@@admin.budget:Budget`,
          icon: 'fa-calculator',
          menu: 'COMPTA',
          route: '/comptabilite',
          queryParams: { vue: 'BUDGET' },
          hint: $localize`:@@admin.budgetHint:Préparer et suivre le budget par classe comptable`,
        },
        {
          label: $localize`:@@admin.financialFlows:Flux financiers`,
          icon: 'fa-scale-balanced',
          menu: 'COMPTA',
          route: '/comptabilite',
          queryParams: { vue: 'FLUX' },
          hint: $localize`:@@admin.financialFlowsHint:Suivre les recettes, dépenses et échéanciers associés`,
        },
        {
          label: $localize`:@@admin.transactions:Opérations`,
          icon: 'fa-right-left',
          menu: 'TRANSACTION',
          route: '/operations',
          queryParams: { context: 'LISTE' },
          hint: $localize`:@@admin.transactionsHint:Consulter et rapprocher les opérations bancaires`,
        },
        {
          label: $localize`:@@admin.stock:Stocks`,
          icon: 'fa-boxes-stacked',
          menu: 'STOCK',
          route: '/stock',
          hint: $localize`:@@admin.stockHint:Gérer le catalogue matériel, les lieux, les achats et l’inventaire`,
        },
      ],
    },
    {
      title: $localize`:@@admin.communication.title:Communication`,
      subtitle: $localize`:@@admin.communication.subtitle:Envois, modèles et suivi des communications`,
      tiles: [
        {
          label: $localize`:@@admin.sendEmails:Envoyer des mails`,
          icon: 'fa-paper-plane',
          menu: 'ENVOIMAIL',
          route: '/envoi-mail',
          hint: $localize`:@@admin.sendEmailsHint:Préparer un message et sélectionner ses destinataires`,
        },
        {
          label: $localize`:@@admin.emailSettings:Configuration mails`,
          icon: 'fa-envelope-circle-check',
          menu: 'PROJETMAIL',
          route: '/projet-mail',
          hint: $localize`:@@admin.emailSettingsHint:Configurer les modèles utilisés par les mails automatiques`,
        },
        {
          label: $localize`:@@admin.emailTracking:Suivi des mails`,
          icon: 'fa-chart-line',
          menu: 'SUIVIMAIL',
          route: '/suivi-mails',
          hint: $localize`:@@admin.emailTrackingHint:Consulter l’historique des envois et les éventuelles erreurs`,
        },
      ],
    },
    {
      title: $localize`:@@admin.settings.title:Paramétrage`,
      subtitle: $localize`:@@admin.settings.subtitle:Référentiels et configuration stable du club`,
      tiles: [
        {
          label: $localize`:@@admin.project:Projet`,
          icon: 'fa-sliders',
          menu: 'PROJETINFO',
          route: '/admin-projet',
          hint: $localize`:@@admin.projectHint:Configurer les informations, comptes et paramètres du projet`,
        },
        {
          label: $localize`:@@admin.seasons:Saisons`,
          icon: 'fa-calendar',
          menu: 'SAISON',
          route: '/saison',
          hint: $localize`:@@admin.seasonsHint:Créer les saisons et définir la saison active`,
        },
        {
          label: $localize`:@@admin.locations:Lieux`,
          icon: 'fa-location-dot',
          menu: 'LIEU',
          route: '/lieu',
          hint: $localize`:@@admin.locationsHint:Référencer les salles, gymnases et lieux de stockage`,
        },
        {
          label: $localize`:@@admin.instructors:Professeurs`,
          icon: 'fa-person-chalkboard',
          menu: 'PROF',
          route: '/professeur',
          hint: $localize`:@@admin.instructorsHint:Référencer les encadrants intervenant dans le club`,
        },
        {
          label: $localize`:@@admin.bankAccounts:Comptes bancaires`,
          icon: 'fa-building-columns',
          menu: 'CB',
          route: '/compte-bancaire',
          hint: $localize`:@@admin.bankAccountsHint:Configurer les comptes utilisés par les opérations financières`,
        },
        {
          label: $localize`:@@admin.addinfoLists:Champs complémentaires`,
          icon: 'fa-table-list',
          menu: 'ADDINFO',
          route: '/addinfo-listes',
          hint: $localize`:@@admin.addinfoListsHint:Créer les champs personnalisés et administrer leurs listes de valeurs`,
        },
      ],
    },
    {
      title: $localize`:@@admin.support.title:Assistance`,
      subtitle: $localize`:@@admin.support.subtitle:Signaler rapidement un problème rencontré dans Assolutions`,
      tiles: [
        {
          label: $localize`:@@admin.reportBug:Signaler un bug`,
          icon: 'fa-bug',
          menu: 'JOURNAL_ERREURS',
          action: 'BUG_REPORT',
          hint: $localize`:@@admin.reportBugHint:Envoyer un mail de diagnostic avec le contexte technique utile`,
        },
      ],
    },
  ];

  constructor(
    public store: AppStore,
    private router: Router,
    private saisonApi: SaisonApiService,
    private bugReportApi: BugReportApiService,
  ) {}

  ngOnInit(): void {
    void this.loadSaisons();
  }

  get activeSaisonId(): number | null {
    return Number(this.store.saison_active_reelle_id() ?? 0) || null;
  }

  get consultationSaisonId(): number | null {
    return Number(this.store.saison_consultation_id() ?? 0) || null;
  }

  get isConsultingActiveSeason(): boolean {
    return this.consultationSaisonId === this.activeSaisonId;
  }

  async loadSaisons(): Promise<void> {
    this.loadingSaisons = true;
    try {
      const saisons = await this.saisonApi.list();
      this.saisons = [...(saisons ?? [])].sort((a: any, b: any) =>
        String(b?.nom ?? b?.libelle ?? '').localeCompare(
          String(a?.nom ?? a?.libelle ?? ''),
        ),
      );

      const requested = this.consultationSaisonId ?? this.activeSaisonId;
      this.selectedSaisonId = this.saisons.some(
        (saison: any) => Number(saison.id) === Number(requested),
      )
        ? Number(requested)
        : this.activeSaisonId;

      this.store.setConsultationSaison(
        this.selectedSaisonId === this.activeSaisonId
          ? null
          : this.selectedSaisonId,
      );
    } finally {
      this.loadingSaisons = false;
    }
  }

  getSaisonLabel(saison: any): string {
    const fallback = $localize`:@@admin.seasonFallback:Saison #${saison?.id}:SEASON_ID:`;
    const label = saison?.nom ?? saison?.libelle ?? saison?.name ?? fallback;
    return Number(saison?.id) === this.activeSaisonId
      ? $localize`:@@admin.activeSeasonLabel:${label}:SEASON: — active`
      : label;
  }

  onSaisonChange(value: string | number | null): void {
    const saisonId = Number(value);
    this.selectedSaisonId = Number.isInteger(saisonId) && saisonId > 0
      ? saisonId
      : this.activeSaisonId;

    this.store.setConsultationSaison(
      this.selectedSaisonId === this.activeSaisonId
        ? null
        : this.selectedSaisonId,
    );
  }

  open(tile: AdminTile): void {
    if (tile.action === 'BUG_REPORT') {
      this.openBugReport();
      return;
    }

    if (!tile.route || tile.disabled) return;
    this.store.updateSelectedMenu(tile.menu);
    this.router.navigate([tile.route], {
      queryParams: {
        ...(tile.queryParams ?? {}),
        saisonId: this.consultationSaisonId,
      },
    });
  }

  openBugReport(): void {
    this.bugReport = this.createEmptyBugReport();
    this.bugReport.screen = this.router.url;
    this.bugReportError = '';
    this.bugReportSuccess = '';
    this.bugReportOpen = true;
  }

  closeBugReport(): void {
    if (this.bugReportSending) return;
    this.bugReportOpen = false;
    this.bugReportError = '';
    this.bugReportSuccess = '';
  }

  async submitBugReport(): Promise<void> {
    const title = this.bugReport.title.trim();
    const description = this.bugReport.description.trim();

    this.bugReportError = '';
    this.bugReportSuccess = '';

    if (!title || !description) {
      this.bugReportError = $localize`:@@admin.reportBugRequired:Le titre et la description sont obligatoires.`;
      return;
    }

    const accountEmail = String(this.store.compte()?.login ?? '').trim();

    this.bugReportSending = true;
    try {
      await this.bugReportApi.send({
        title,
        description,
        screen: this.bugReport.screen.trim() || undefined,
        severity: this.bugReport.severity,
        steps: this.bugReport.steps.trim() || undefined,
        expected: this.bugReport.expected.trim() || undefined,
        actual: this.bugReport.actual.trim() || undefined,
        route: this.router.url,
        browser: window.navigator.userAgent,
        accountEmail: accountEmail || undefined,
      });

      this.bugReportSuccess = $localize`:@@admin.reportBugSuccess:Le signalement a bien été envoyé. Merci !`;
    } catch (error) {
      console.error('Envoi du signalement impossible', error);
      this.bugReportError = $localize`:@@admin.reportBugError:L’envoi du signalement a échoué. Réessaie dans quelques instants.`;
    } finally {
      this.bugReportSending = false;
    }
  }

  private createEmptyBugReport(): BugReportForm {
    return {
      title: '',
      description: '',
      screen: '',
      severity: 'NORMALE',
      steps: '',
      expected: '',
      actual: '',
    };
  }
}

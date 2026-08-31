import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '../app.store';
import { SaisonApiService } from '../../services/saison-api.service';
import { MenuType } from '../../store/session.store';

type AdminTile = {
  label: string;
  icon: string;
  menu: MenuType;
  route?: string;
  queryParams?: Record<string, any>;
  disabled?: boolean;
  hint?: string;
};

type AdminSection = {
  title: string;
  subtitle?: string;
  tiles: AdminTile[];
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

  sections: AdminSection[] = [
    {
      title: $localize`:@@admin.sport.title:Gestion sportive`,
      subtitle: $localize`:@@admin.sport.subtitle:Le quotidien de la saison consultée`,
      tiles: [
        { label: $localize`:@@admin.members:Adhérents`, icon: 'fa-users', menu: 'ADHERENT', route: '/adherent' },
        { label: $localize`:@@admin.registrationFees:Tarifs d'inscription`, icon: 'fa-tags', menu: 'INSCRIPTION', route: '/inscription' },
        { label: $localize`:@@admin.promoCodes:Codes promotionnels`, icon: 'fa-ticket', menu: 'INSCRIPTION', route: '/codes-promo' },
        { label: $localize`:@@admin.requirements:Exigences des dossiers`, icon: 'fa-list-check', menu: 'INSCRIPTION', route: '/exigences-dossier' },
        { label: $localize`:@@admin.classes:Cours`, icon: 'fa-chalkboard-user', menu: 'COURS', route: '/cours' },
        { label: $localize`:@@admin.sessions:Séances`, icon: 'fa-calendar-days', menu: 'SEANCE', route: '/seance' },
        { label: $localize`:@@admin.groups:Groupes`, icon: 'fa-layer-group', menu: 'GROUPE', route: '/groupe' },
        { label: $localize`:@@admin.instructorContracts:Contrats professeurs`, icon: 'fa-file-signature', menu: 'CONTRAT_PROF', route: '/contrat-prof' },
      ],
    },
    {
      title: $localize`:@@admin.finance.title:Finances`,
      subtitle: $localize`:@@admin.finance.subtitle:Budget, flux financiers, paiements et trésorerie`,
      tiles: [
        { label: $localize`:@@admin.financeDashboard:Tableau finance`, icon: 'fa-chart-pie', menu: 'COMPTA', route: '/comptabilite', queryParams: { vue: 'DASHBOARD' } },
        { label: $localize`:@@admin.budget:Budget`, icon: 'fa-calculator', menu: 'COMPTA', route: '/comptabilite', queryParams: { vue: 'BUDGET' } },
        { label: $localize`:@@admin.financialFlows:Flux financiers`, icon: 'fa-scale-balanced', menu: 'COMPTA', route: '/comptabilite', queryParams: { vue: 'FLUX' } },
        { label: $localize`:@@admin.transactions:Opérations`, icon: 'fa-right-left', menu: 'TRANSACTION', route: '/operations', queryParams: { context: 'LISTE' } },
      ],
    },
    {
      title: $localize`:@@admin.communication.title:Communication`,
      subtitle: $localize`:@@admin.communication.subtitle:Mails et modèles`,
      tiles: [
        { label: $localize`:@@admin.sendEmails:Envoyer des mails`, icon: 'fa-paper-plane', menu: 'ENVOIMAIL', route: '/envoi-mail' },
        { label: $localize`:@@admin.emailSettings:Configuration mails`, icon: 'fa-envelope-circle-check', menu: 'PROJETMAIL', route: '/projet-mail' },
      ],
    },
    {
      title: $localize`:@@admin.settings.title:Paramétrage`,
      subtitle: $localize`:@@admin.settings.subtitle:Référentiels et configuration stable`,
      tiles: [
        { label: $localize`:@@admin.project:Projet`, icon: 'fa-sliders', menu: 'PROJETINFO', route: '/admin-projet', hint: $localize`:@@admin.projectHint:Infos, comptes et personnes du projet` },
        { label: $localize`:@@admin.seasons:Saisons`, icon: 'fa-calendar', menu: 'SAISON', route: '/saison' },
        { label: $localize`:@@admin.locations:Lieux`, icon: 'fa-location-dot', menu: 'LIEU', route: '/lieu' },
        { label: $localize`:@@admin.instructors:Professeurs`, icon: 'fa-person-chalkboard', menu: 'PROF', route: '/professeur' },
        { label: $localize`:@@admin.bankAccounts:Comptes bancaires`, icon: 'fa-building-columns', menu: 'CB', route: '/compte-bancaire' },
      ],
    },
  ];

  constructor(
    public store: AppStore,
    private router: Router,
    private saisonApi: SaisonApiService,
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
    if (!tile.route || tile.disabled) return;
    this.store.updateSelectedMenu(tile.menu);
    this.router.navigate([tile.route], {
      queryParams: {
        ...(tile.queryParams ?? {}),
        saisonId: this.consultationSaisonId,
      },
    });
  }
}

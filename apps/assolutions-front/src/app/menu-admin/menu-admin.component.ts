import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '../app.store';
import { SaisonApiService } from '../../services/saison-api.service';
import { MenuType } from '../../store/session.store';
import { HelloAssoService } from '../../services/helloasso.service';

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
  readonly saisonStorageKey = 'assolutions.consultationSaisonId';

  saisons: any[] = [];
  selectedSaisonId: number | null = null;
  loadingSaisons = false;

  sections: AdminSection[] = [
    {
      title: 'Gestion sportive',
      subtitle: 'Le quotidien de la saison consultée',
      tiles: [
        { label: 'Adhérents', icon: 'fa-users', menu: 'ADHERENT', route: '/adherent' },
        { label: "Tarifs d'inscription", icon: 'fa-tags', menu: 'INSCRIPTION', route: '/inscription' },
        { label: 'Codes promotionnels', icon: 'fa-ticket', menu: 'INSCRIPTION', route: '/codes-promo' },
        { label: 'Cours', icon: 'fa-chalkboard-user', menu: 'COURS', route: '/cours' },
        { label: 'Séances', icon: 'fa-calendar-days', menu: 'SEANCE', route: '/seance' },
        { label: 'Groupes', icon: 'fa-layer-group', menu: 'GROUPE', route: '/groupe' },
        { label: 'Contrats professeurs', icon: 'fa-file-signature', menu: 'CONTRAT_PROF', route: '/contrat-prof' },
      ],
    },
    {
      title: 'Finances',
      subtitle: 'Budget, flux financiers, paiements et trésorerie',
      tiles: [
        { label: 'Tableau finance', icon: 'fa-chart-pie', menu: 'COMPTA', route: '/comptabilite', queryParams: { vue: 'DASHBOARD' } },
        { label: 'Budget', icon: 'fa-calculator', menu: 'COMPTA', route: '/comptabilite', queryParams: { vue: 'BUDGET' } },
        { label: 'Flux financiers', icon: 'fa-scale-balanced', menu: 'COMPTA', route: '/comptabilite', queryParams: { vue: 'FLUX' } },
        { label: 'Opérations', icon: 'fa-right-left', menu: 'TRANSACTION', route: '/operations', queryParams: { context: 'LISTE' } },
        { label: 'Stocks', icon: 'fa-boxes-stacked', menu: 'STOCK', route: '/stock' },
      ],
    },
    {
      title: 'Communication',
      subtitle: 'Mails, modèles et suivi',
      tiles: [
        { label: 'Envoyer des mails', icon: 'fa-paper-plane', menu: 'ENVOIMAIL', route: '/envoi-mail' },
        { label: 'Configuration mails', icon: 'fa-envelope-circle-check', menu: 'PROJETMAIL', route: '/projet-mail' },
        { label: 'Suivi des mails', icon: 'fa-chart-line', menu: 'SUIVIMAIL', route: '/suivi-mail' },
      ],
    },
    {
      title: 'Paramétrage',
      subtitle: 'Référentiels et configuration stable',
      tiles: [
        { label: 'Saisons', icon: 'fa-calendar', menu: 'SAISON', route: '/saison' },
        { label: 'Lieux', icon: 'fa-location-dot', menu: 'LIEU', route: '/lieu' },
        { label: 'Professeurs', icon: 'fa-person-chalkboard', menu: 'PROF', route: '/professeur' },
        { label: 'Comptes bancaires', icon: 'fa-building-columns', menu: 'CB', route: '/compte-bancaire' },
        { label: 'Listes de valeur', icon: 'fa-list-check', menu: 'LISTE_VALEUR', route: '/gestion-liste' },
      ],
    },
    {
      title: 'Projet',
      subtitle: 'Configuration propre au projet',
      tiles: [
        { label: 'Infos projet', icon: 'fa-circle-info', menu: 'PROJETINFO', route: '/projet-info' },
        { label: 'Comptes utilisateurs', icon: 'fa-user-gear', menu: 'COMPTE', route: '/compte' },
        { label: 'Champs personnalisés', icon: 'fa-sliders', menu: 'ADDINFO', route: '/addinfo', disabled: true, hint: 'À brancher' },
      ],
    },
    {
      title: 'Outils',
      subtitle: 'Maintenance, imports et traces',
      tiles: [
        { label: 'Imports / exports', icon: 'fa-file-import', menu: 'IMPORT_EXPORT', route: '/imports-exports', disabled: true, hint: 'À brancher' },
        { label: 'Documents', icon: 'fa-folder-open', menu: 'DOCUMENT', route: '/documents', disabled: true, hint: 'À brancher' },
        { label: 'Photos', icon: 'fa-images', menu: 'PHOTOS', route: '/photos', disabled: true, hint: 'À brancher' },
        { label: 'Journal / erreurs', icon: 'fa-triangle-exclamation', menu: 'JOURNAL_ERREURS', route: '/journal-erreurs', disabled: true, hint: 'À brancher' },
      ],
    },
  ];

  constructor(
    public store: AppStore,
    private router: Router,
    private saisonApi: SaisonApiService,
    private helloassoservice: HelloAssoService,
  ) {}

  ngOnInit(): void {
    this.loadSaisons();
  }

  async loadSaisons(): Promise<void> {
    this.loadingSaisons = true;
    try {
      const saisons = await this.saisonApi.list();
      this.saisons = [...(saisons ?? [])].sort((a: any, b: any) =>
        String(b?.nom ?? b?.libelle ?? '').localeCompare(String(a?.nom ?? a?.libelle ?? '')),
      );
      const stored = Number(localStorage.getItem(this.saisonStorageKey));
      const activeId = this.getActiveSaisonId();
      this.selectedSaisonId =
        Number.isFinite(stored) && this.saisons.some((s: any) => Number(s.id) === stored)
          ? stored
          : activeId;
    } finally {
      this.loadingSaisons = false;
    }
  }

  testHelloAsso(): void {
    this.helloassoservice.testHelloAsso().catch((error) => {
      console.error('Erreur lors du test HelloAsso :', error);
    });
  }

  getActiveSaisonId(): number | null {
    const project: any = this.store.selectedProject?.();
    return project?.saison_active?.id ?? project?.saison_active_id ?? null;
  }

  getSaisonLabel(saison: any): string {
    return saison?.nom ?? saison?.libelle ?? saison?.name ?? `Saison #${saison?.id}`;
  }

  onSaisonChange(value: string | number | null): void {
    const saisonId = value === null || value === '' ? null : Number(value);
    this.selectedSaisonId = Number.isFinite(saisonId) ? saisonId : null;
    if (this.selectedSaisonId) {
      localStorage.setItem(this.saisonStorageKey, String(this.selectedSaisonId));
    } else {
      localStorage.removeItem(this.saisonStorageKey);
    }
    window.dispatchEvent(
      new CustomEvent('assolutions:consultation-saison-changed', {
        detail: { saisonId: this.selectedSaisonId },
      }),
    );
  }

  open(tile: AdminTile): void {
    if (tile.disabled || !tile.route) return;
    this.store.updateSelectedMenu(tile.menu);
    this.router.navigate([tile.route], { queryParams: tile.queryParams });
  }
}

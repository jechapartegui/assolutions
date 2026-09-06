import { Component, OnInit } from '@angular/core';
import {
  SouscriptionMonitorApiService,
  SouscriptionMonitorDetail,
  SouscriptionMonitorListItem,
  SouscriptionMonitorTimelineItem,
} from '../../services/souscription-monitor-api.service';
import { AppStore } from '../app.store';

@Component({
  selector: 'app-souscription-monitor',
  templateUrl: './souscription-monitor.component.html',
  styleUrls: ['./souscription-monitor.component.css'],
  standalone: false,
})
export class SouscriptionMonitorComponent implements OnInit {
  records: SouscriptionMonitorListItem[] = [];
  selected: SouscriptionMonitorDetail | null = null;
  loading = false;
  detailLoading = false;
  error = '';
  detailError = '';

  search = '';
  statusFilter = 'ALL';
  seasonFilter = 'ALL';
  dateFrom = '';
  dateTo = '';

  constructor(
    private readonly api: SouscriptionMonitorApiService,
    private readonly store: AppStore,
  ) {}

  ngOnInit(): void {
    this.store.updateSelectedMenu('TRACES_PAIEMENT');
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.records = await this.api.list();
      if (this.selected && !this.records.some((item) => item.id === this.selected?.souscription.id)) {
        this.selected = null;
      }
    } catch (error) {
      console.error('Chargement du suivi des inscriptions impossible', error);
      this.error = 'Impossible de charger le suivi des inscriptions.';
      this.records = [];
    } finally {
      this.loading = false;
    }
  }

  get filteredRecords(): SouscriptionMonitorListItem[] {
    const term = this.search.trim().toLocaleLowerCase('fr');
    const from = this.dateFrom ? new Date(`${this.dateFrom}T00:00:00`).getTime() : null;
    const to = this.dateTo ? new Date(`${this.dateTo}T23:59:59.999`).getTime() : null;

    return this.records.filter((item) => {
      if (this.statusFilter !== 'ALL' && item.statut !== this.statusFilter) return false;
      if (this.seasonFilter !== 'ALL' && String(item.saison_id) !== this.seasonFilter) return false;

      const created = new Date(item.created_at).getTime();
      if (from != null && created < from) return false;
      if (to != null && created > to) return false;

      if (!term) return true;
      return [
        item.id,
        item.compte_id,
        item.compte_login,
        item.payeur,
        item.payeur_email,
        item.statut,
        item.payment_state,
        item.checkout_intent_id,
        item.order_id,
        ...item.personnes,
        ...item.personne_ids,
      ]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLocaleLowerCase('fr').includes(term));
    });
  }

  get statuses(): string[] {
    return [...new Set(this.records.map((item) => item.statut).filter(Boolean))].sort();
  }

  get seasons(): Array<{ id: number; name: string }> {
    const map = new Map<number, string>();
    for (const item of this.records) map.set(item.saison_id, item.saison_nom);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => b.id - a.id);
  }

  get finalizedCount(): number {
    return this.records.filter((item) => item.statut === 'FINALISEE').length;
  }

  get pendingCount(): number {
    return this.records.filter((item) => item.statut === 'EN_ATTENTE_PAIEMENT').length;
  }

  get warningCount(): number {
    return this.records.filter((item) => item.warnings?.length || item.error_message).length;
  }

  async openDetail(item: SouscriptionMonitorListItem): Promise<void> {
    this.detailLoading = true;
    this.detailError = '';
    this.selected = null;
    try {
      this.selected = await this.api.detail(item.id);
    } catch (error) {
      console.error(`Chargement de la souscription ${item.id} impossible`, error);
      this.detailError = `Impossible de charger le détail de la souscription #${item.id}.`;
    } finally {
      this.detailLoading = false;
    }
  }

  closeDetail(): void {
    this.selected = null;
    this.detailError = '';
  }

  clearFilters(): void {
    this.search = '';
    this.statusFilter = 'ALL';
    this.seasonFilter = 'ALL';
    this.dateFrom = '';
    this.dateTo = '';
  }

  statusLabel(status: string | null | undefined): string {
    const labels: Record<string, string> = {
      BROUILLON: 'Brouillon',
      EN_ATTENTE_PAIEMENT: 'En attente de paiement',
      PAYEE: 'Payée',
      FINALISEE: 'Finalisée',
      ANNULEE: 'Annulée',
      ERREUR: 'Erreur',
    };
    const key = String(status ?? '').toUpperCase();
    return labels[key] ?? status ?? '—';
  }

  statusClass(status: string | null | undefined): string {
    switch (String(status ?? '').toUpperCase()) {
      case 'FINALISEE':
      case 'PAYEE':
      case 'ACTIVE':
        return 'is-success';
      case 'EN_ATTENTE_PAIEMENT':
        return 'is-warning';
      case 'ANNULEE':
        return 'is-light';
      case 'ERREUR':
        return 'is-danger';
      default:
        return 'is-info is-light';
    }
  }

  timelineClass(item: SouscriptionMonitorTimelineItem): string {
    switch (item.level) {
      case 'SUCCESS':
        return 'timeline-success';
      case 'WARNING':
        return 'timeline-warning';
      case 'ERROR':
        return 'timeline-error';
      default:
        return 'timeline-info';
    }
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }

  money(centimes: number | null | undefined): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(Number(centimes ?? 0) / 100);
  }

  detailsText(details: unknown): string {
    if (!details) return '';
    try {
      return JSON.stringify(details, null, 2);
    } catch {
      return String(details);
    }
  }

  trackById(_index: number, item: SouscriptionMonitorListItem): number {
    return item.id;
  }
}

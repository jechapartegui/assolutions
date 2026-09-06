import { Component, OnInit } from '@angular/core';
import {
  MailRecordApiService,
  MailRecordView,
} from '../../services/mail-record-api.service';

@Component({
  selector: 'app-mail-record-monitor',
  templateUrl: './mail-record-monitor.component.html',
  styleUrls: ['./mail-record-monitor.component.css'],
  standalone: false,
})
export class MailRecordMonitorComponent implements OnInit {
  records: MailRecordView[] = [];
  loading = false;
  error = '';

  search = '';
  statusFilter: 'ALL' | 'SENT' | 'FAILED' = 'ALL';
  typeFilter = 'ALL';

  constructor(private readonly api: MailRecordApiService) {}

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.records = await this.api.list();
    } catch (error: unknown) {
      console.error('Chargement du suivi des mails impossible', error);
      this.error = 'Impossible de charger le suivi des mails.';
      this.records = [];
    } finally {
      this.loading = false;
    }
  }

  get filteredRecords(): MailRecordView[] {
    const term = this.search.trim().toLowerCase();

    return this.records.filter((item) => {
      const status = this.normalizedStatus(item);
      if (this.statusFilter !== 'ALL' && status !== this.statusFilter) return false;
      if (this.typeFilter !== 'ALL' && item.record !== this.typeFilter) return false;

      if (!term) return true;
      return [item.to, item.subject, item.record, item.error]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }

  get recordTypes(): string[] {
    return [...new Set(this.records.map((item) => item.record).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'fr'));
  }

  get sentCount(): number {
    return this.records.filter((item) => this.normalizedStatus(item) === 'SENT').length;
  }

  get failedCount(): number {
    return this.records.filter((item) => this.normalizedStatus(item) === 'FAILED').length;
  }

  normalizedStatus(item: MailRecordView): 'SENT' | 'FAILED' {
    return item.status === 'FAILED' ? 'FAILED' : 'SENT';
  }

  statusLabel(item: MailRecordView): string {
    return this.normalizedStatus(item) === 'FAILED' ? 'Échec' : 'Envoyé';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Historique';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Historique';

    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }

  trackById(_index: number, item: MailRecordView): number {
    return item.id;
  }
}

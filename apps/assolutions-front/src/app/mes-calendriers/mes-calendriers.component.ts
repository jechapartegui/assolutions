import { Component, OnInit } from '@angular/core';
import { Calendrier, CalendrierApiService } from '../../services/calendrier-api.service';

@Component({
  selector: 'app-mes-calendriers',
  templateUrl: './mes-calendriers.component.html',
  standalone: false,
})
export class MesCalendriersComponent implements OnInit {
  loading = false;
  error = '';
  calendriers: Calendrier[] = [];
  constructor(private readonly service: CalendrierApiService) {}
  async ngOnInit() {
    this.loading = true;
    try { this.calendriers = await this.service.mes(); }
    catch (e: any) { this.error = String(e?.message || e); }
    finally { this.loading = false; }
  }
}

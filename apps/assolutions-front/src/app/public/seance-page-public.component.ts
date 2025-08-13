import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Seance_VM } from '@shared/src/lib/seance.interface';
import { addDays, getWeekStart } from '../utils/date.utils';
import { seancesVmToEvents } from '../../class/calendar-event';
import { SeancesService } from '../../services/seance.service';

@Component({ standalone:false, selector: 'app-seances-page', templateUrl: './seances-page-public.component.html' })
export class SeancesPage {
  seances = signal<Seance_VM[]>([]);
  view = signal<'list'|'calendar'>('calendar');
  weekOffset = signal(0);

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    public seanceserv: SeancesService
  ) {
    this.route.queryParamMap.subscribe(q => {
      this.view.set((q.get('view') as any) || 'calendar');
      this.weekOffset.set(parseInt(q.get('week') || '0', 10));
    });

    this.seanceserv.GetSeancePublic(1).then(s => {
      const parsed = (s || []).map(x => ({
        ...x,
        date_seance: x.date_seance instanceof Date ? x.date_seance : new Date(x.date_seance)
      }));
      this.seances.set(parsed);
    });
  }

  referenceDate = computed(() => {
    const start = getWeekStart(new Date());
    return addDays(start, this.weekOffset() * 7);
  });

  events = computed(() => {
    const start = getWeekStart(this.referenceDate());
    const end = addDays(start, 6);

    const list = this.seances();
    if (!list.length) return []; // ✅ garde-fou

    const inWeek = list.filter(s => s.date_seance >= start && s.date_seance <= end);
    return seancesVmToEvents(inWeek);
  });
}

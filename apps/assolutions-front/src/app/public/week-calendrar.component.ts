// src/app/components/week-calendar/week-calendar.component.ts
import { Component,  Output, EventEmitter, computed, input, effect, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { getWeekStart, weekDays, timeToMinutes, addDays} from '../utils/date.utils';
import { CalendarEvent } from '../../class/calendar-event';
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

type RenderEvent = CalendarEvent & {
  top: number;     // %
  height: number;  // %
  left: number;    // %
  width: number;   // %
};
@Component({
    standalone:false,
  selector: 'app-week-calendar',
  templateUrl: './week-calendar.component.html',
  styleUrls: ['./week-calendar.component.scss']
})
export class WeekCalendarComponent implements AfterViewInit {
  // Inputs (signals)
  referenceDate = input<Date>(new Date());
  events        = input<CalendarEvent[]>([]);
  showNav       = input<boolean>(true);

  // Événements navigation
  @Output() prevWeek = new EventEmitter<void>();
  @Output() nextWeek = new EventEmitter<void>();
  @Output() todayWeek = new EventEmitter<void>();

  // Constantes d'affichage
  private readonly MAX_COLS = 3;
  private readonly DAY_TOTAL_MIN = 24 * 60;
  private readonly HOUR_HEIGHT_PX = 56;  // hauteur d'une heure en px
  private readonly DEFAULT_SCROLL_HOUR = 8;

  @ViewChild('scroller', { static: true }) scrollerRef!: ElementRef<HTMLDivElement>;

  // Semaine affichée
  weekStart = computed(() => getWeekStart(this.referenceDate()));
  weekEndExcl = computed(() => addDays(this.weekStart(), 7));

  // Jours & heures (0→24, on scroll auto vers 8h)
  days = computed(() => weekDays(this.weekStart()));
  hours = computed(() => Array.from({ length: 24 }, (_, h) => h)); // 0..23

  // Filtre : ne garder que les events de la semaine affichée
  weekEvents = computed(() => {
    const start = this.weekStart();
    const endEx = this.weekEndExcl();
    return (this.events() ?? []).filter(ev => {
      // ev.date attendu au format 'YYYY-MM-DD'
      // on compare par string pour la semaine courante
      const d = new Date(ev.date + 'T00:00:00');
      return d >= start && d < endEx;
    });
  });

  // Mise en colonnes parallèles (jusqu'à 3) + positions %
  layoutByDay = computed(() => {
    const out = new Map<string, RenderEvent[]>();
    const groups = new Map<string, CalendarEvent[]>();

    for (const ev of this.weekEvents()) {
      if (!groups.has(ev.date)) groups.set(ev.date, []);
      groups.get(ev.date)!.push(ev);
    }

    groups.forEach((list, date) => {
      // Trier par début puis fin
      const items = list
        .map(ev => ({ ev, s: timeToMinutes(ev.start), e: timeToMinutes(ev.end) }))
        .sort((a,b) => (a.s - b.s) || (a.e - b.e));

      const active: Array<{ s:number; e:number; col:number }> = [];
      const rendered: RenderEvent[] = [];

      for (const it of items) {
        // purge des overlaps terminés
        for (let i = active.length - 1; i >= 0; i--) {
          if (active[i].e <= it.s) active.splice(i, 1);
        }

        // attribuer la plus petite colonne libre (0..2), sinon col=2
        const used = new Set(active.map(a => a.col));
        let col = 0;
        while (used.has(col) && col < this.MAX_COLS) col++;
        if (col >= this.MAX_COLS) col = this.MAX_COLS - 1;

        active.push({ s: it.s, e: it.e, col });

        // nb de colonnes visibles à cet instant (max 3)
        const cols = Math.min(this.MAX_COLS, Math.max(...active.map(a => a.col)) + 1);

        // positionnement (0→24h)
        const top = (it.s / this.DAY_TOTAL_MIN) * 100;
        const durMin = Math.max(20, it.e - it.s); // min visuelle 20 min
        const height = (durMin / this.DAY_TOTAL_MIN) * 100;

        const width = 100 / cols;
        const left = col * width;

        rendered.push({
          ...it.ev,
          top, height, left, width
        });
      }

      out.set(date, rendered);
    });

    return out;
  });
// Id unique pour la colonne "jour"
trackByDay(_index: number, d: DayView) {
  return d.iso; // clé stable, ex. '2025-09-01'
}

// Id unique pour un event rendu
trackByEvent(_index: number, ev: any) {
  return ev.id ?? `${ev.title ?? ''}|${ev.start}|${ev.end}|${ev.date}`;
}


  // scroll auto vers 8h au changement de semaine
  ngAfterViewInit(): void {
    // au montage
    this.scrollToHour(this.DEFAULT_SCROLL_HOUR);

    // à chaque changement de référence
    effect(() => {
      this.referenceDate(); // on observe
      // laisser Angular peindre avant de scroller
      setTimeout(() => this.scrollToHour(this.DEFAULT_SCROLL_HOUR), 0);
    });
  }

  private scrollToHour(h: number) {
    const el = this.scrollerRef?.nativeElement;
    if (!el) return;
    el.scrollTop = this.HOUR_HEIGHT_PX * h;
  }

  // Helpers pour le template
  dayKey(d: Date): string { return ymd(d); }
}
type DayView = { date: Date; iso: string; label: string; wd: number };
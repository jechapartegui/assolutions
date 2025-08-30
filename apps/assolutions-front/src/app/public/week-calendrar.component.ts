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
public dayIso(d: DayView) { return this.key10FromDate(d.date); }
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
    const d = new Date(this.key10(ev.date) + 'T00:00:00'); // local midnight
    return d >= start && d < endEx;
  });
});


// Fenêtre de 8h calculée sur la semaine affichée
hoursRange = computed(() => {
  const evs = this.weekEvents();
  if (!evs.length) {
    const s = this.DEFAULT_SCROLL_HOUR;
    return { start: s, end: Math.min(24, s + 8) };
  }
  const startsMin = Math.min(...evs.map(e => timeToMinutes(e.start)));
  let startHour = Math.floor(startsMin / 60);
  startHour = Math.max(0, Math.min(16, startHour)); // clamp pour garantir 8h dans 0..24
  return { start: startHour, end: startHour + 8 };
});

// extrait une clé 'YYYY-MM-DD' sûre depuis une string quelconque
private key10 = (s: string | undefined | null) => {
  const t = (s ?? '').toString().trim();

  // déjà au bon format
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

  // formats 'YYYY-M-D' / 'YYYY-MM-D' / 'YYYY-M-DD'
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // fallback: parse Date puis formate
  const d2 = new Date(t);
  return isNaN(d2.getTime()) ? t.slice(0, 10) : this.key10FromDate(d2);
};


// même clé pour un Date JS local
private key10FromDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
};

// Heures affichées (ex: 14..21 pour un rail 14:00→22:00 + "last" visuelle)
viewHours = computed(() => {
  const { start, end } = this.hoursRange();        // [start, end[
  return Array.from({ length: end - start }, (_, i) => start + i);
});

// Aides
viewStartMin = computed(() => this.hoursRange().start * 60);
viewTotalMin = computed(() => (this.hoursRange().end - this.hoursRange().start) * 60);

// Mise en colonnes + positionnement dans la FENÊTRE (8h)
layoutByDay = computed(() => {
  const out = new Map<string, RenderEvent[]>();
  const groups = new Map<string, CalendarEvent[]>();
const key = (ev: CalendarEvent) => this.key10(ev.date);

for (const ev of this.weekEvents()) {
  const k = key(ev);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k)!.push(ev);
}




  const VIEW_S = this.viewStartMin();
  const VIEW_E = VIEW_S + this.viewTotalMin();

  groups.forEach((list, date) => {
    const items = list
      .map(ev => ({ ev, s: timeToMinutes(ev.start), e: timeToMinutes(ev.end) }))
      .sort((a,b) => (a.s - b.s) || (a.e - b.e));

    const active: Array<{ s:number; e:number; col:number }> = [];
    const rendered: RenderEvent[] = [];

    for (const it of items) {
      // purge overlaps terminés
      for (let i = active.length - 1; i >= 0; i--) {
        if (active[i].e <= it.s) active.splice(i, 1);
      }

      // colonne dispo (0..2)
      const used = new Set(active.map(a => a.col));
      let col = 0; while (used.has(col) && col < this.MAX_COLS) col++;
      if (col >= this.MAX_COLS) col = this.MAX_COLS - 1;
      active.push({ s: it.s, e: it.e, col });

      const cols = Math.min(this.MAX_COLS, Math.max(...active.map(a => a.col)) + 1);

      // Tronquer à la fenêtre 8h
      const rs = Math.max(it.s, VIEW_S);
      const re = Math.min(it.e, VIEW_E);
      if (re <= VIEW_S || rs >= VIEW_E) continue; // complètement hors fenêtre

      const top = ((rs - VIEW_S) / this.viewTotalMin()) * 100;
      const durMin = Math.max(20, re - rs); // min visuelle
      const height = (durMin / this.viewTotalMin()) * 100;

      const width = 100 / cols;
      const left = col * width;

      rendered.push({ ...it.ev, top, height, left, width });
    }
out.set(date, rendered);
  });

  return out;
});

// Indicateur "il y a des séances après la fenêtre" par jour
dayHasAfter = computed(() => {
  const VIEW_E = this.viewStartMin() + this.viewTotalMin();
  const flags = new Map<string, boolean>();
  const key = (ev: CalendarEvent) => this.key10(ev.date);
  for (const ev of this.weekEvents()) {
    if (timeToMinutes(ev.end) > VIEW_E) flags.set(key(ev), true);
  }
  return flags;
});

// Hauteur de la grille (8h * 56px)
gridHeightPx = computed(() => this.HOUR_HEIGHT_PX * (this.hoursRange().end - this.hoursRange().start));

// scroll auto vers le début de fenêtre
ngAfterViewInit(): void {
  effect(() => {
    // re-scroll au début de la fenêtre
    setTimeout(() => this.scrollToHour(this.hoursRange().start), 0);
  });
}

private scrollToHour(h: number) {
  const el = this.scrollerRef?.nativeElement;
  if (!el) return;
  el.scrollTop = this.HOUR_HEIGHT_PX * (h - this.hoursRange().start); // aligné sur début fenêtre
}

// Helpers template
hourLabel(h: number) { return (h < 10 ? '0' + h : h) + ':00'; }
// Id unique pour la colonne "jour"
trackByDay(_index: number, d: DayView) {
  return d.iso; // clé stable, ex. '2025-09-01'
}

// Id unique pour un event rendu
trackByEvent(_index: number, ev: any) {
  return ev.id ?? `${ev.title ?? ''}|${ev.start}|${ev.end}|${ev.date}`;
}




  // Helpers pour le template
  dayKey(d: Date): string { return ymd(d); }
}
type DayView = { date: Date; iso: string; label: string; wd: number };
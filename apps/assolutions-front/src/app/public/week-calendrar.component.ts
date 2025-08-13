// src/app/components/week-calendar/week-calendar.component.ts
import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { getWeekStart, weekDays, timeToMinutes } from '../utils/date.utils';
import { CalendarEvent } from '../../class/calendar-event';

@Component({
    standalone:false,
  selector: 'app-week-calendar',
  templateUrl: './week-calendar.component.html',
  styleUrls: ['./week-calendar.component.scss']
})
export class WeekCalendarComponent {
  @Input() referenceDate: Date = new Date(); // n'importe quelle date de la semaine
  @Input() events: CalendarEvent[] = [];
  @Input() minHour = 14;   // bornes d'affichage
  @Input() maxHour = 23;
  @Input() showNav = true; // ← permet de masquer la nav (cas Cours)

  @Output() prevWeek = new EventEmitter<void>();
  @Output() nextWeek = new EventEmitter<void>();
  @Output() todayWeek = new EventEmitter<void>();

  days = computed(() => weekDays(getWeekStart(this.referenceDate)));
  hours = computed(() => Array.from({length: (this.maxHour - this.minHour + 1)}, (_,i) => this.minHour + i));

  grouped = computed(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of this.events) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    for (const arr of map.values()) arr.sort((a,b)=> timeToMinutes(a.start) - timeToMinutes(b.start));
    return map;
  });

  topPct(start: string) {
    const total = (this.maxHour - this.minHour) * 60;
    const from = timeToMinutes(start) - this.minHour*60;
    return Math.max(0, Math.min(100, from/total*100));
  }

  heightPct(start: string, end: string) {
    const total = (this.maxHour - this.minHour) * 60;
    const h = Math.max(20, timeToMinutes(end) - timeToMinutes(start));
    return Math.max(2, Math.min(100, h/total*100));
  }
}
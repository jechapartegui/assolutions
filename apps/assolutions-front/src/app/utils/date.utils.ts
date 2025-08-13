// src/app/utils/date.utils.ts
export const toDate = (isoDate: string) => new Date(isoDate + 'T00:00:00');

// LUNDI = 0 (cohérence FR)
export function getWeekStart(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // JS: 0=dimanche => 0=lundi
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  start.setHours(0,0,0,0);
  return start;
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + days);
  return r;
}

export function formatISO(d: Date): string {
  return d.toISOString().slice(0,10);
}

export function weekDays(start: Date): { date: Date; iso: string; label: string; wd: number }[] {
  const days = [] as { date: Date; iso: string; label: string; wd: number }[];
  for (let i=0;i<7;i++) {
    const dd = addDays(start, i);
    days.push({
      date: dd,
      iso: formatISO(dd),
      wd: i,
      label: dd.toLocaleDateString('fr-FR', { weekday:'short', day:'2-digit', month:'2-digit' })
    });
  }
  return days;
}

export function timeToMinutes(hhmm: string): number {
  const [h,m] = hhmm.split(':').map(Number);
  return h*60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins/60);
  const m = mins%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

export function addMinutesToTime(hhmm: string, minutes: number): string {
  return minutesToTime(timeToMinutes(hhmm) + minutes);
}

const WD_MAP: Record<string, number> = {
  'lundi':0, 'mardi':1, 'mercredi':2, 'jeudi':3, 'vendredi':4, 'samedi':5, 'dimanche':6,
  '0':0, '1':1, '2':2, '3':3, '4':4, '5':5, '6':6
};
export function weekdayIndex(label: string): number {
  const key = (label ?? '').toString().trim().toLowerCase();
  return WD_MAP[key] ?? 0; // défaut: lundi
}
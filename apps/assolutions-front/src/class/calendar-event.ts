import { addDays, getWeekStart, addMinutesToTime, formatISO, weekdayIndex } from "../app/utils/date.utils";

import { Cours_VM } from '@shared/lib/cours.interface';
import { Seance_VM } from '@shared/lib/seance.interface';
// class/calendar-event.ts
// class/calendar-event.ts
// ⬅ ajuster le chemin d'import selon ton arbo

export interface CalendarEvent {
  id: number;
  date: string;     // 'YYYY-MM-DD' (obligatoire pour le WeekCalendar)
  start: string;    // 'HH:mm'
  end: string;      // 'HH:mm'
  title?: string;
  subtitle?: string;   // ex: RDV / info
  location?: string;   // ex: lieu
  statut?: 'prévue' | 'annulée' | 'réalisée' | string; // ← conservé pour les SÉANCES
  essai_possible?: boolean;
}



/** Projette les cours (jour/heure) sur la semaine dont 'monday' est le lundi. */
export function coursVmToEvents(cours: Cours_VM[] | null | undefined, monday: Date): CalendarEvent[] {
  if (!cours?.length || !(monday instanceof Date)) return [];

  return cours.flatMap(c => {
    const dow = weekdayIndex(c.jour_semaine); // 0..6 (lundi=0), -1 si invalide
    if (dow < 0) return [];

    const start = (c.heure || '').trim();       // 'HH:mm'
    if (!/^\d{1,2}:\d{2}$/.test(start)) return [];

    const thatDay = addDays(new Date(monday), dow);
    const date = formatISO(thatDay).slice(0, 10);  // 'YYYY-MM-DD'
    const end = addMinutesToTime(start, Number(c.duree) || 0);

    const ev: CalendarEvent = {
      id: c.id,
      date,
      start: start.padStart(5, '0'),
      end,
      title: c.nom || '',
      location: c.lieu_nom ?? (c.lieu_id?.toString() || ''),
      subtitle: c.rdv || ''
      // ⚠ ne PAS mettre 'statut' ici (les cours n'en ont pas)
    };
    return [ev];
  });
}


// Mappe les Séances sur des events; status normalisé sans "meta"
export function seancesVmToEvents(seances: Seance_VM[]): CalendarEvent[] {
  const mapStatut = (s: Seance_VM['statut']): CalendarEvent['statut'] =>
    s === 'annulée' ? 'annulee' : s === 'réalisée' ? 'realisee' : 'prevue';

  return seances.map(s => ({
    type:"seance",
    id: s.id,
    date: formatISO(s.date_seance),
    start: s.heure_debut,
    end: addMinutesToTime(s.heure_debut, s.duree_seance || 0),
      subtitle: s.heure_debut + ' - ' + addMinutesToTime(s.heure_debut, s.duree_seance || 0),
      location: s.lieu_nom || '',
    title: s.nom || s.cours_nom || 'Séance',
    essai_possible: s.essai_possible || false,
    status: mapStatut(s.statut)
  }));
}

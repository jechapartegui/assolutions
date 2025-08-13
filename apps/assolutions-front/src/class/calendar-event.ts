import { Cours_VM, Seance_VM } from "@shared/src";
import { addDays, getWeekStart, addMinutesToTime, formatISO, weekdayIndex } from "../app/utils/date.utils";

export interface CalendarEvent{
     type : "seance" | "cours";
    id:number;
     date: string;   // "YYYY-MM-DD"
   start: string;  // "HH:mm"
  end: string;    // "HH:mm"
   title: string;
  status?: 'prevue' | 'realisee' | 'annulee'; // (principalement pour Séances)

}

export function coursVmToEvents(cours: Cours_VM[], anyDateInWeek = new Date()): CalendarEvent[] {
  const start = getWeekStart(anyDateInWeek);
  return cours.map(c => {
    const idx = weekdayIndex(c.jour_semaine);
    const date = addDays(start, idx);
    return {
    type: "cours",
      id: c.id,
      date: formatISO(date),
      start: c.heure,
      end: addMinutesToTime(c.heure, c.duree || 0),
      title: c.nom,
      status:null,
    } satisfies CalendarEvent;
  });
}
// Mappe les Séances sur des events; status normalisé sans "meta"
export function seancesVmToEvents(seances: Seance_VM[]): CalendarEvent[] {
  const mapStatut = (s: Seance_VM['statut']): CalendarEvent['status'] =>
    s === 'annulée' ? 'annulee' : s === 'réalisée' ? 'realisee' : 'prevue';

  return seances.map(s => ({
    type:"seance",
    id: s.seance_id,
    date: formatISO(s.date_seance),
    start: s.heure_debut,
    end: addMinutesToTime(s.heure_debut, s.duree_seance || 0),
    title: s.libelle || s.cours_nom || 'Séance',
    status: mapStatut(s.statut)
  }));
}

// src/app/components/course-list-public/course-list-public.component.ts
import { Component, Input } from '@angular/core';
import { Cours_VM } from '@shared/lib/cours.interface';
import { addMinutesToTime, getWeekStart, addDays } from '../utils/date.utils';

@Component({
  standalone: false,
  selector: 'app-course-list-public',
  templateUrl: './course-list-public.component.html',
  styleUrls: ['./course-list-public.component.scss']
})
export class CourseListPublicComponent {
  @Input() items: Cours_VM[] = [];
  @Input() referenceDate: Date = new Date(); // pour afficher la date de la SEMAINE courante (figée)

  end(heure: string, duree: number) { return addMinutesToTime(heure, duree || 0); }

  // Lundi=0 ... Dimanche=6 (aligne avec week calendar)
  private dayIndex(day: string | number): number {
    if (typeof day === 'number') return ((day % 7) + 7) % 7;
    const d = (day || '').toString().toLowerCase().trim();
    const map: Record<string, number> = {
      'lundi': 0, 'lun': 0,
      'mardi': 1, 'mar': 1,
      'mercredi': 2, 'mer': 2,
      'jeudi': 3, 'jeu': 3,
      'vendredi': 4, 'ven': 4,
      'samedi': 5, 'sam': 5,
      'dimanche': 6, 'dim': 6
    };
    return map[d] ?? 0;
  }

  /** Date affichée = jour correspondant dans la semaine de referenceDate (figée) */
  nextDate(c: Cours_VM): Date {
    const ws = getWeekStart(this.referenceDate);
    return addDays(ws, this.dayIndex(c.jour_semaine));
  }

  /** Tri: jour de semaine puis heure */
  get sorted(): Cours_VM[] {
    return [...(this.items || [])].sort((a, b) => {
      const da = this.dayIndex(a.jour_semaine);
      const db = this.dayIndex(b.jour_semaine);
      if (da !== db) return da - db;
      const ha = (a.heure || '');
      const hb = (b.heure || '');
      return ha.localeCompare(hb);
    });
  }
}

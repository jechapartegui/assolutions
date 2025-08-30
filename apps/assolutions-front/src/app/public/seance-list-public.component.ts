// seance-list-public.component.ts
import { Seance_VM } from "@shared/lib/seance.interface";
import { addMinutesToTime } from "../utils/date.utils";
import { Component, Input } from "@angular/core";
import { Router } from "@angular/router";

@Component({
  standalone:false,
  selector:'app-seance-list-public',
  templateUrl:'./seance-list-public.component.html',
  styleUrls:['./seance-list-public.component.scss'] // ⬅ ajoute un style dédié
})
export class SeanceListComponent {
  constructor(private router:Router){}

  @Input() items: Seance_VM[] = [];

  end(h: string, d: number) { return addMinutesToTime(h, d || 0); }

  get sorted(): Seance_VM[] {
    return [...(this.items || [])].sort((a,b) => {
      const ta = new Date(a.date_seance).getTime();
      const tb = new Date(b.date_seance).getTime();
      if (ta !== tb) return ta - tb;

      // en cas d'égalité, trier par heure de début si dispo
      const sa = a.heure_debut || '';
      const sb = b.heure_debut || '';
      return sa.localeCompare(sb);
    });
  }

  Essayer(id:number){ this.router.navigate(['/seances-essais'], { queryParams: { id } }); }

  GetType(type: string) {
    switch (type) {
      case 'ENTRAINEMENT': return $localize`Entraînement`;
      case 'SORTIE':       return $localize`Sortie`;
      case 'MATCH':        return $localize`Match`;
      case 'EVENEMENT':    return $localize`Evénement`;
      default:             return '';
    }
  }
}

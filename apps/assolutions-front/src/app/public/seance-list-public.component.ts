import { Seance_VM } from "@shared/src/lib/seance.interface";
import { addMinutesToTime } from "../utils/date.utils";
import { Component, Input } from "@angular/core";
import { Router } from "@angular/router";

@Component({ standalone:false, selector:'app-seance-list-public', templateUrl:'./seance-list-public.component.html' })
export class SeanceListComponent {
    constructor(private router:Router){}
  @Input() items: Seance_VM[] = [];
  end(h: string, d: number) { return addMinutesToTime(h, d || 0); }

  Essayer(id:number){
    this.router.navigate(['/seances-essais'], { queryParams: { id: id } });
  }
   GetType(type) {
    switch (type) {
      case 'ENTRAINEMENT':
        return $localize`Entraînement`;
      case 'SORTIE':
        return $localize`Sortie`;
      case 'MATCH':
        return $localize`Match`;
      case 'EVENEMENT':
        return $localize`Evénement`;
    }
    return '';
  }
}
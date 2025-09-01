import { Component, computed, OnInit, signal } from '@angular/core';
import { getWeekStart } from '../utils/date.utils';
import { coursVmToEvents } from '../../class/calendar-event';
import { CoursService } from '../../services/cours.service';
import { Cours_VM } from '@shared/lib/cours.interface';
import { ProjetView } from '@shared/lib/compte.interface';
import { AppStore } from '../app.store';
import { ActivatedRoute, Router } from '@angular/router';
import { SaisonService } from '../../services/saison.service';

@Component({ standalone:false, selector: 'app-cours-page-public', templateUrl: './course-page-public-component.html' })
export class CoursPage implements OnInit {
public cours = signal<Cours_VM[]>([]);
  view = signal<'list'|'calendar'>('calendar');
  isSmallScreen = false;
  projet: number = 0;

  constructor(public coursserv: CoursService, public store:AppStore,
    private route: ActivatedRoute,
        public saisonserv:SaisonService,
    public router: Router,) {}

  ngOnInit(): void {
          this.route.queryParams.subscribe((params) => {
            if ('id' in params) {
              this.projet = params['id'];
            }
          });
    // Charge les cours
    const PV:ProjetView= {
          id : this.projet,
          nom:"",
          adherent:false,
          prof  :false,
          essai:false,
        }
        this.store.updateProjet(PV);
    // quelque part dans ton composant/service d’amorçage
    this.saisonserv.GetAll().then(saisons => {
      this.store.updateSaisonActive(saisons.find(s => s.active));    
    this.coursserv.GetAll(this.store.saison_active().id).then((c)=> this.cours.set(c));
    });

    // Force mobile -> liste
    if (typeof window !== 'undefined') {
      this.isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
      if (this.isSmallScreen) this.view.set('list');
    }
  }

referenceDate = computed(() => getWeekStart(new Date()));

// Normalisation clé 'YYYY-MM-DD' en LOCAL
private key10FromDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

events = computed(() => {
  const ref = this.referenceDate();
  const weekStart = new Date(ref);
  const weekEndExcl = new Date(ref);
  weekEndExcl.setDate(weekEndExcl.getDate() + 7);

  // On part du mapping existant puis on filtre et on normalise la clé 'date'
  const all = coursVmToEvents(this.cours(), this.referenceDate());

  const within = (ev: any) => {
    // si ev.date est 'YYYY-MM-DD', on recrée un Date local
    let d: Date;
    if (typeof ev.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ev.date)) {
      const [y,m,dd] = ev.date.split('-').map(Number);
      d = new Date(y, m - 1, dd);
    } else {
      d = new Date(ev.date);
    }
    return d >= weekStart && d < weekEndExcl;
  };

  return (all || [])
    .filter(within)
    .map(ev => {
      // force la clé utilisée par le calendrier : 'YYYY-MM-DD' local
      let d: Date;
      if (typeof ev.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ev.date)) {
        const [y,m,dd] = ev.date.split('-').map(Number);
        d = new Date(y, m - 1, dd);
      } else {
        d = new Date(ev.date);
      }
      return { ...ev, date: this.key10FromDate(d) };
    });
});

}

import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Seance_VM } from '@shared/lib/seance.interface';
import { addDays, getWeekStart } from '../utils/date.utils';
import { seancesVmToEvents } from '../../class/calendar-event';
import { SeancesService } from '../../services/seance.service';
import { AppStore } from '../app.store';
import { SaisonService } from '../../services/saison.service';
import { ProjetView } from '@shared/lib/compte.interface';


@Component({ standalone:false, selector: 'app-seances-page', templateUrl: './seances-page-public.component.html' })
export class SeancesPage {
  seances = signal<Seance_VM[]>([]);
  view = signal<'list'|'calendar'>('calendar');
  weekOffset = signal(0);
  projet: number = 0;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    public seanceserv: SeancesService,
    public saisonserv:SaisonService,
    public store:AppStore
  ) {
       this.route.queryParams.subscribe((params) => {
            if ('id' in params) {
              this.projet = params['id'];
            }
          });
    this.route.queryParamMap.subscribe(q => {      
      this.view.set((q.get('view') as any) || 'calendar');
      this.weekOffset.set(parseInt(q.get('week') || '0', 10));
    });
    const PV:ProjetView= {
      id : this.projet,
      nom:"",
      adherent:false,
      prof  :false,
      essai:false,
    }
    this.store.updateProjet(PV);
    this.saisonserv.GetAll().then(saisons => {
      this.store.updateSaisonActive(saisons.find(s => s.active));
    this.seanceserv.GetSeancePublic(this.store.saison_active().id).then(s => {
      const parsed = (s || []).map(x => ({
        ...x,
        date_seance: x.date_seance instanceof Date ? x.date_seance : new Date(x.date_seance)
      }));
      this.seances.set(parsed);
    });
    });
  }

baseMonday = computed(() => {
  const list = this.seances() ?? [];
  const today = new Date();
  const mondayThisWeek = getWeekStart(today);
  const sundayExclusive = addDays(mondayThisWeek, 7);

  const hasThisWeek = list.some(s => {
    const d = toDateLocal(s.date_seance);
    return d >= mondayThisWeek && d < sundayExclusive;
  });

  if (hasThisWeek) return mondayThisWeek;

  // Cherche la première séance future (>= maintenant)
  const next = list
    .map(s => toDateLocal(s.date_seance))
    .filter(d => d.getTime() >= today.getTime())
    .sort((a, b) => a.getTime() - b.getTime())[0];

  return next ? getWeekStart(next) : mondayThisWeek;
});

// Lundi affiché = baseMonday + offset (navigation semaines)
referenceDate = computed(() => addDays(this.baseMonday(), this.weekOffset() * 7));

// Tes événements pour la semaine affichée
events = computed(() => {
  const start = getWeekStart(this.referenceDate());
  const sundayExclusive = addDays(start, 7); // [lundi, lundi+7[
  const list = this.seances() ?? [];
  if (!list.length) return [];

  // 1) garder seulement les séances de la semaine affichée
  const weekSeances = list.filter(s => {
    const d = toDateLocal(s.date_seance);
    return d >= start && d < sundayExclusive; // borne haute exclusive
  });

  // 2) transformer chaque séance en event(s)
  const mapped = seancesVmToEvents(weekSeances);

  // 3) trier par date puis (optionnel) par heure début puis titre
  mapped.sort((a: any, b: any) => {
    const ta = toDateLocal(a.date).getTime();
    const tb = toDateLocal(b.date).getTime();
    if (ta !== tb) return ta - tb;

    // si tes events ont des champs d'heure (ex: a.start "HH:mm")
    const sa = a.start ?? '';
    const sb = b.start ?? '';
    if (sa !== sb) return sa.localeCompare(sb);

    return (a.title ?? '').localeCompare(b.title ?? '');
  });

  return mapped;
});
}

function toDateLocal(src: string | Date): Date {
  if (src instanceof Date) return new Date(src.getTime());
  if (/^\d{4}-\d{2}-\d{2}$/.test(src)) {
    const [y,m,dd] = src.split('-').map(Number);
    return new Date(y, m - 1, dd);
  }
  return new Date(src);
}


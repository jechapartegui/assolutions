import { Component, computed, OnInit, signal } from '@angular/core';
import { getWeekStart } from '../utils/date.utils';
import { coursVmToEvents } from '../../class/calendar-event';
import { CoursService } from '../../services/cours.service';
import { Cours_VM } from '@shared/lib/cours.interface';

@Component({ standalone:false, selector: 'app-cours-page-public', templateUrl: './course-page-public-component.html' })
export class CoursPage implements OnInit {
  public cours: Cours_VM[] = [];
  view = signal<'list'|'calendar'>('calendar');
  isSmallScreen = false;

  constructor(public coursserv: CoursService) {}

  ngOnInit(): void {
    // Charge les cours
    this.coursserv.GetAll(1).then((c)=> { this.cours = c; });

    // Force mobile -> liste
    if (typeof window !== 'undefined') {
      this.isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
      if (this.isSmallScreen) this.view.set('list');
    }
  }

  referenceDate = computed(() => getWeekStart(new Date())); // figé = semaine courante
  events = computed(() => coursVmToEvents(this.cours, this.referenceDate()));
}

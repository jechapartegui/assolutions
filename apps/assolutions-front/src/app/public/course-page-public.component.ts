import { Component, computed, OnInit, signal } from '@angular/core';
import { getWeekStart } from '../utils/date.utils';
import { coursVmToEvents } from '../../class/calendar-event';
import { Cours_VM } from '@shared/src';
import { CoursService } from '../../services/cours.service';

@Component({ standalone:false,selector: 'app-cours-page-public', templateUrl: './course-page-public-component.html' })
export class CoursPage implements OnInit {
  // mock → à remplacer par service
  public cours:Cours_VM[];
constructor(public coursserv:CoursService){}
  ngOnInit(): void {
      this.coursserv.GetAll(1).then((c)=> {
        this.cours = c;

      }
    )
  }
  view = signal<'list'|'calendar'>('calendar');
  referenceDate = computed(() => getWeekStart(new Date())); // figé = semaine courante
  events = computed(() => coursVmToEvents(this.cours, this.referenceDate()));
}
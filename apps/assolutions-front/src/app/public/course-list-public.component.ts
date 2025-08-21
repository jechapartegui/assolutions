// src/app/components/course-list/course-list.component.ts
import { Component, Input } from '@angular/core';
import { Cours_VM } from '@shared/lib/cours.interface';
import { addMinutesToTime } from '../utils/date.utils';

@Component({ standalone:false,selector:'app-course-list-public', templateUrl:'./course-list-public.component.html' })
export class CourseListPublicComponent {
  @Input() items: Cours_VM[] = [];
  end(heure: string, duree: number) { return addMinutesToTime(heure, duree || 0); }
}
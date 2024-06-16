import { Component } from '@angular/core';

@Component({
  selector: 'app-adherent',
  templateUrl: './adherent.component.html',
  styleUrls: ['./adherent.component.css']
})
export class AdherentComponent {
  context:"VUE"|"LIST" = "VUE";
  thisAdherent = null;
}

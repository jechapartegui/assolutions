import { Component, Input, OnInit } from '@angular/core';
import { KeyValuePair } from 'src/class/keyvaluepair';

@Component({
  selector: 'app-prof',
  templateUrl: './prof.component.html',
  styleUrls: ['./prof.component.css']
})
export class ProfComponent implements OnInit { 
  @Input() Profs:KeyValuePair[]=[];
  @Input() liste_prof:KeyValuePair[]=[];
  current_prof_key:number;
  @Input() prof_dispo:KeyValuePair[]=[];

  ngOnInit(): void {
    this.MAJListeProf();
  }

  AjouterProf() {
    const indexToUpdate = this.liste_prof.findIndex(cc => cc.key === this.current_prof_key);
    const newValue = this.liste_prof[indexToUpdate];
    this.Profs.push(newValue);
    this.current_prof_key = null;
    this.MAJListeProf();

  }
  RemoveProf(item) {
    this.Profs = this.Profs.filter(e => e.key !== item.key);
    this.MAJListeProf();
  }
  MAJListeProf() {
    this.prof_dispo = this.liste_prof;
    this.Profs.forEach((element: KeyValuePair) => {
      let element_to_remove = this.liste_prof.find(e => e.key == element.key);
      if (element_to_remove) {
        this.prof_dispo = this.prof_dispo.filter(e => e.key !== element_to_remove.key);
      }
    });
  }
}


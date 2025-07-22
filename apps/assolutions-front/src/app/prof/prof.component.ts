import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { GlobalService } from '../../services/global.services';
import { KeyValuePair } from '@shared/src/lib/autres.interface';
import { Professeur_VM } from '@shared/src/lib/prof.interface';
import { Seance_VM, SeanceProfesseur_VM } from '@shared/src/lib/seance.interface';

@Component({
  selector: 'app-prof',
  templateUrl: './prof.component.html',
  styleUrls: ['./prof.component.css']
})
export class ProfComponent implements OnInit { 
  @Input() liste_prof:Professeur_VM[]=[];
  @Input() manage = false;
  @Input() thisSeance:Seance_VM;
  @Input() Profs:SeanceProfesseur_VM[] = [];
  current_prof_key:number;
  action:string = "";
  LVSeanceProf :KeyValuePair[];
  @Input() prof_dispo:Professeur_VM[]=[];
  @Output() profUpdated = new EventEmitter<SeanceProfesseur_VM[]>();  // Ajout du @Output()

  constructor(public globserv:GlobalService){}
  ngOnInit(): void {
    this.MAJListeProf();
    this.LVSeanceProf = this.globserv.ListeSeanceProf;
  }

  AjouterProf() {
    this.action = $localize`Ajouter un professeur à la séance`;
    const indexToUpdate = this.liste_prof.findIndex(cc => cc.person.id === this.current_prof_key);
    const newValue = this.liste_prof[indexToUpdate];
    let S = new SeanceProfesseur_VM();
    S.minutes = this.thisSeance.duree_seance;
    S.personne = newValue.person;
    S.seance_id = this.thisSeance.seance_id;
    S.statut = this.thisSeance.statut;
    S.cout = newValue.taux;
    
      this.Profs.push(S);
      this.current_prof_key = null;
      this.MAJListeProf();
      this.profUpdated.emit(this.Profs);  // Emettre l'event après l'ajout
  
      
  }
  
  RemoveProf(item) {
    this.action = $localize`Supprimer un professeur de la liste`;    
      this.Profs = this.Profs.filter(e => e.personne.id !== item.professeur_id);
      this.MAJListeProf();
      this.profUpdated.emit(this.Profs); 
   
      
  }
  MAJListeProf() {
    this.prof_dispo = this.liste_prof;
    this.Profs.forEach((element: SeanceProfesseur_VM) => {
      let element_to_remove = this.liste_prof.find(e => e.person.id == element.personne.id);
      if (element_to_remove) {
        this.prof_dispo = this.prof_dispo.filter(e => e.person.id !== element_to_remove.person.id);
      }
    });
  }
}


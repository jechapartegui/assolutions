import { Component, Input, OnInit } from '@angular/core';
import { KeyValuePair } from 'src/class/keyvaluepair';
import { Professeur } from 'src/class/professeur';
import { seance, Seance } from 'src/class/seance';
import { SeanceProf } from 'src/class/seanceprof';
import { GlobalService } from 'src/services/global.services';

@Component({
  selector: 'app-prof',
  templateUrl: './prof.component.html',
  styleUrls: ['./prof.component.css']
})
export class ProfComponent implements OnInit { 
  @Input() liste_prof:Professeur[]=[];
  @Input() thisSeance:Seance;
  @Input() Profs:SeanceProf[] = [];
  current_prof_key:number;
  LVSeanceProf :KeyValuePair[];
  @Input() prof_dispo:Professeur[]=[];

  constructor(public globserv:GlobalService){}
  ngOnInit(): void {
    this.MAJListeProf();
    this.LVSeanceProf = this.globserv.ListeSeanceProf;
  }

  AjouterProf() {
    const indexToUpdate = this.liste_prof.findIndex(cc => cc.id === this.current_prof_key);
    const newValue = this.liste_prof[indexToUpdate];
    let S = new SeanceProf();
    S.minutes = this.thisSeance.duree_seance;
    S.professeur_id = newValue.id;
    S.prenom = newValue.prenom ;
    S.nom = newValue.nom;
    S.seance_id = this.thisSeance.ID;
    S.statut = 0;
    S.taux_horaire = newValue.taux;
    this.Profs.push(S);
    this.current_prof_key = null;
    this.MAJListeProf();

  }
  RemoveProf(item) {
    this.Profs = this.Profs.filter(e => e.professeur_id !== item.professeur_id);
    this.MAJListeProf();
  }
  MAJListeProf() {
    this.prof_dispo = this.liste_prof;
    this.Profs.forEach((element: SeanceProf) => {
      let element_to_remove = this.liste_prof.find(e => e.id == element.professeur_id);
      if (element_to_remove) {
        this.prof_dispo = this.prof_dispo.filter(e => e.id !== element_to_remove.id);
      }
    });
  }
}


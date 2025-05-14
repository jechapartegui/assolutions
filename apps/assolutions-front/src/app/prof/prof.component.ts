import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { professeur } from '../../class/professeur';
import { Seance } from '../../class/seance';
import { SeanceProf } from '../../class/seanceprof';
import { ErrorService } from '../../services/error.service';
import { GlobalService } from '../../services/global.services';
import { SeanceprofService } from '../../services/seanceprof.service';
import { KeyValuePair } from '@shared/compte/src/lib/autres.interface';

@Component({
  selector: 'app-prof',
  templateUrl: './prof.component.html',
  styleUrls: ['./prof.component.css']
})
export class ProfComponent implements OnInit { 
  @Input() liste_prof:professeur[]=[];
  @Input() manage = false;
  @Input() thisSeance:Seance;
  @Input() Profs:SeanceProf[] = [];
  current_prof_key:number;
  action:string = "";
  LVSeanceProf :KeyValuePair[];
  @Input() prof_dispo:professeur[]=[];
  @Output() profUpdated = new EventEmitter<SeanceProf[]>();  // Ajout du @Output()

  constructor(public globserv:GlobalService, private sean_prof:SeanceprofService){}
  ngOnInit(): void {
    this.MAJListeProf();
    this.LVSeanceProf = this.globserv.ListeSeanceProf;
  }

  AjouterProf() {
    const errorService = ErrorService.instance;
    this.action = $localize`Ajouter un professeur à la séance`;
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
    if(this.thisSeance.ID == 0){      
      this.Profs.push(S);
      this.current_prof_key = null;
      this.MAJListeProf();
      this.profUpdated.emit(this.Profs);  // Emettre l'event après l'ajout
    } else {
      this.sean_prof.Add(S).then((_id) =>{
        S.id = _id;
        this.Profs.push(S);
        this.current_prof_key = null;
        this.MAJListeProf();
        this.profUpdated.emit(this.Profs); 
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      })
    }     
  }
  
  RemoveProf(item) {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer un professeur de la liste`;
    if(this.thisSeance.ID == 0){
      this.Profs = this.Profs.filter(e => e.professeur_id !== item.professeur_id);
      this.MAJListeProf();
      this.profUpdated.emit(this.Profs); 
    } else {
    this.sean_prof.Delete(item.id).then(ok=>{
      if(ok){
        this.Profs = this.Profs.filter(e => e.professeur_id !== item.professeur_id);
        this.MAJListeProf();
        this.profUpdated.emit(this.Profs); 
      } else {
        let o = errorService.CreateError(this.action,$localize`Erreur inconnue`);
        errorService.emitChange(o);
      }
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
      return;
    })}
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
  Update(niv:SeanceProf){
    const errorService = ErrorService.instance;
    this.action = $localize`Mise à jour des informations du professeurs pour la séance`;
    this.sean_prof.Update(niv).then(ok=>{
      if(ok){
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      } else {
        let o = errorService.CreateError(this.action,$localize`Erreur inconnue`);
        errorService.emitChange(o);
      }
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
      return;
    })
  }
}


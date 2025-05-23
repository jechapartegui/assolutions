import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: 'caracteristique-seance',
  templateUrl: './caracteristique_seance.component.html',
  styleUrls: ['./caracteristique_seance.component.css'],
})
export class CaracSeanceComponent  {
@Input() age_min: boolean = false;
@Input() age_min_valeur: number = -1;
@Input() age_max: boolean = false;
@Input() age_max_valeur: number = -1;
@Input() place_limite: boolean = false;
@Input() place_limite_valeur: number = -1;
@Input() essai_possible: boolean = false;
@Input() vis_essai_possible: boolean = false; // si true, on affiche le bouton "essai" dans la liste des caractéristiques
@Input() Regles: any;
@Output() valueChange = new EventEmitter<any>();

constructor() { }
  
}
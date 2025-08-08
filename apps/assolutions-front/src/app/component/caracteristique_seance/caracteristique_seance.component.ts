import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ValidationItem } from "@shared/src/lib/autres.interface";
import type { ReglesSeance } from "apps/assolutions-front/src/class/regles";
import { GlobalService } from "apps/assolutions-front/src/services/global.services";

@Component({
  standalone: false,
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
@Input() afficher_present: boolean = false;
@Input() ID: number = 0; // ID de la séance
@Input() vis_essai_possible: boolean = false; 
@Input() vis_afficher_present:boolean = false;// si true, on affiche le bouton "essai" dans la liste des caractéristiques
@Input() Regles: ReglesSeance;
@Output() valueChange = new EventEmitter<caracteristique>();
@Output() valid = new EventEmitter<boolean>();
public save: string = null;
public edit: boolean = false;
public estValid: boolean = false;

constructor() { }
async ngOnInit(): Promise<void> {
this.vis_afficher_present = this.Regles.vis_afficher_present;
this.vis_essai_possible = this.Regles.vis_essai_possible;
let ddl: caracteristique = {
    age_min: this.age_min,
    age_min_valeur: this.age_min_valeur,
    age_max: this.age_max,
    age_max_valeur: this.age_max_valeur,
    place_limite: this.place_limite,
    place_limite_valeur: this.place_limite_valeur,
    essai_possible: this.essai_possible,
    vis_essai_possible: this.Regles.vis_essai_possible,   
    vis_afficher_present:this.Regles.vis_afficher_present,
    afficher_present:this.afficher_present 
    
};
this.save = JSON.stringify(ddl);
if(this.ID == 0) {
  this.edit = true;
}
    }

    ngOnChanges(): void {
     this.validerTout();
    }
   public Cancel(): void {
  const ddl: caracteristique = JSON.parse(this.save);
  this.age_min = ddl.age_min;
  this.age_min_valeur = ddl.age_min_valeur;
  this.age_max = ddl.age_max;
  this.age_max_valeur = ddl.age_max_valeur;
  this.place_limite = ddl.place_limite;
  this.place_limite_valeur = ddl.place_limite_valeur;
  this.essai_possible = ddl.essai_possible;
  this.afficher_present = ddl.afficher_present;
  this.vis_afficher_present = ddl.vis_afficher_present;
  this.vis_essai_possible = ddl.vis_essai_possible;
  this.edit = false;
  this.validerTout();
}

public Save(): void {
  const current: caracteristique = {
    age_min: this.age_min,
    age_min_valeur: this.age_min_valeur,
    age_max: this.age_max,
    age_max_valeur: this.age_max_valeur,
    place_limite: this.place_limite,
    place_limite_valeur: this.place_limite_valeur,
    essai_possible: this.essai_possible,
    vis_essai_possible: this.vis_essai_possible,
    afficher_present: this.afficher_present,
    vis_afficher_present: this.vis_afficher_present
  };

  this.save = JSON.stringify(current);
  this.edit = false;
  this.validerTout();
  if(this.estValid){  
  this.valueChange.emit(current);
  }
}



    public rAgeMin:ValidationItem;
    public rAgeMax:ValidationItem;
    public rPlaceLimite:ValidationItem;
    
   
    
    public validerTout(): void {
     this.rAgeMax = GlobalService.instance.validerNombre(this.age_max_valeur, this.Regles.age_max_valeur_min, this.Regles.age_max_valeur_max, this.age_max, $localize`Âge maximum`);
      this.rAgeMin = GlobalService.instance.validerNombre(this.age_min_valeur, this.Regles.age_min_valeur_min, this.Regles.age_min_valeur_max, this.age_min, $localize`Âge minimum`);
      this.rPlaceLimite = GlobalService.instance.validerNombre(this.place_limite_valeur, this.Regles.place_limite_valeur_min, this.Regles.place_limite_valeur_max, this.place_limite, $localize`Places limitées`);
      
      // valide si tout est bon
      this.estValid = this.rAgeMin.key && this.rAgeMax.key && this.rPlaceLimite.key ; 
      // 🔥 émettre vers le parent
      console.log(this);
      this.valid.emit(this.estValid);
    }
  
}
export type caracteristique = {
  age_min: boolean;
  age_min_valeur: number;
  age_max: boolean;
  age_max_valeur: number;
  place_limite: boolean;
  place_limite_valeur: number;
  essai_possible: boolean;
  vis_essai_possible: boolean; // si true, on affiche le bouton "essai" dans la liste des caractéristiques
  afficher_present: boolean;
  vis_afficher_present: boolean; // si true, on affiche le bouton "essai" dans la liste des caractéristiques
}
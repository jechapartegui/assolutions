import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { ValidationItem } from "@shared/src/lib/autres.interface";
import { Adherent_VM } from "@shared/src/lib/member.interface";
import type { ReglesPersonne } from "apps/assolutions-front/src/class/regles";
import { GlobalService } from "apps/assolutions-front/src/services/global.services";

@Component({
  standalone: false,
  selector: 'infoperso',
  templateUrl: './infoperso.component.html',
  styleUrls: ['./infoperso.component.css'],
})
export class InfoPersoComponent implements OnInit  {
 @Input() thisAdherent:Adherent_VM;
 @Input() Regles:ReglesPersonne;
 @Input() photoBase64: string | null = null;
 save:string=null;
 estValid:boolean;
 @Output() InfoPersoChange = new EventEmitter();
  @Output() valid = new EventEmitter<boolean>();
 public edit:boolean = false

ngOnInit(): void {
    this.save = JSON.stringify(this.thisAdherent); 
    if(this.thisAdherent.id <1){
      this.edit = true;
    }
}
ngOnChanges(): void {
 this.validerTout();
}

 public Save(){
    this.InfoPersoChange.emit();
    this.edit = false;
 }
public Cancel(){
    this.thisAdherent =  JSON.parse(this.save);
    this.edit = false;
}
public rNom:ValidationItem;
public rPrenom:ValidationItem;
public rDateNaissance:ValidationItem;
public rLibelle:ValidationItem;
public rSurnom:ValidationItem;



public validerTout(): void {
  this.rNom = GlobalService.instance.validerChaine(this.thisAdherent.nom, this.Regles.Nom_min, this.Regles.Nom_max, this.Regles.Nom_obligatoire, $localize`Nom`);
  this.rPrenom= GlobalService.instance.validerChaine(this.thisAdherent.prenom, this.Regles.Prenom_min, this.Regles.Prenom_max, this.Regles.Prenom_obligatoire, $localize`Prénom`);
  this.rDateNaissance = GlobalService.instance.validerDate(this.thisAdherent.date_naissance, this.Regles.DateNaissance_min, this.Regles.DateNaissance_max, this.Regles.DateNaissance_obligatoire, $localize`Date de naissance`);
  this.rSurnom = GlobalService.instance.validerChaine(this.thisAdherent.surnom, this.Regles.Surnom_min, this.Regles.Surnom_max, this.Regles.Surnom_obligatoire, $localize`Surnom`);
  this.rLibelle = GlobalService.instance.validerChaine(this.thisAdherent.libelle, this.Regles.Libelle_min, this.Regles.Libelle_max, false, $localize`Libellé (prénom + nom + surnom)`);
  // valide si tout est bon
  this.estValid = this.rNom.key && this.rPrenom.key && this.rLibelle.key && this.rDateNaissance.key && this.rSurnom.key;
  console.log(this.estValid);
  // 🔥 émettre vers le parent
  this.valid.emit(this.estValid);
}


 @Output() photoSelected = new EventEmitter<string>();

onPhotoSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const base64Photo = reader.result as string;
      this.photoBase64 = base64Photo; // Pour affichage immédiat
      this.photoSelected.emit(base64Photo);  // Pour le parent
    };

    reader.readAsDataURL(file); // ==> base64: data:image/...;base64,xxxx
  }
}

 
}
import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { adherent, ValidationItem } from "@shared/compte/src";
import { Adherent } from "apps/assolutions-front/src/class/adherent";
import { ReglesPersonne } from "apps/assolutions-front/src/class/regles";
import { GlobalService } from "apps/assolutions-front/src/services/global.services";

@Component({
  selector: 'infoperso',
  templateUrl: './infoperso.component.html',
  styleUrls: ['./infoperso.component.css'],
})
export class InfoPersoComponent implements OnInit  {
 @Input() thisAdherent:Adherent;
 @Input() Regles:ReglesPersonne;
 save:string=null;
 estValid:boolean;
 @Output() InfoPersoChange = new EventEmitter();
@Output() valid = new EventEmitter<boolean>();
 public edit:boolean = false

ngOnInit(): void {
    this.save = JSON.stringify(this.thisAdherent.datasource); 
    if(this.thisAdherent.ID <1){
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
    let adh:adherent = JSON.parse(this.save);
    this.thisAdherent = new Adherent(adh);
    this.edit = false;
}
public rNom:ValidationItem;
public rPrenom:ValidationItem;
public rDateNaissance:ValidationItem;
public rLibelle:ValidationItem;
public rSurnom:ValidationItem;



public validerTout(): void {
  this.rNom = GlobalService.instance.validerChaine(this.thisAdherent.Nom, this.Regles.Nom_min, this.Regles.Nom_max, this.Regles.Nom_obligatoire, $localize`Nom`);
  this.rPrenom= GlobalService.instance.validerChaine(this.thisAdherent.Prenom, this.Regles.Prenom_min, this.Regles.Prenom_max, this.Regles.Prenom_obligatoire, $localize`Prénom`);
  this.rDateNaissance = GlobalService.instance.validerDate(this.thisAdherent.DateNaissance, this.Regles.DateNaissance_min, this.Regles.DateNaissance_max, this.Regles.DateNaissance_obligatoire, $localize`Date de naissance`);
  this.rLibelle = GlobalService.instance.validerChaine(this.thisAdherent.Surnom, this.Regles.Surnom_min, this.Regles.Surnom_max, this.Regles.Surnom_obligatoire, $localize`Libellé`);
  this.rSurnom = GlobalService.instance.validerChaine(this.thisAdherent.Libelle, this.Regles.Libelle_min, this.Regles.Libelle_max, false, $localize`Surnom`);
  // valide si tout est bon
  this.estValid = this.rNom.key && this.rPrenom.key && this.rLibelle.key && this.rDateNaissance.key && this.rSurnom.key;
  // 🔥 émettre vers le parent
  this.valid.emit(this.estValid);
}


  @Output() photoSelected = new EventEmitter<string>(); // Base64 string

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        const base64Photo = reader.result as string;
        this.photoSelected.emit(base64Photo); // ✅ Émettre vers le parent
      };

      reader.readAsDataURL(file);
    }
  }

 
}
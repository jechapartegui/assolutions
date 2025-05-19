import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { adherent } from "@shared/compte/src";
import { Adherent } from "apps/assolutions-front/src/class/adherent";
import { ReglesPersonne } from "apps/assolutions-front/src/class/regles";

@Component({
  selector: 'infoperso',
  templateUrl: './infoperso.component.html',
  styleUrls: ['./infoperso.component.css'],
})
export class InfoPersoComponent implements OnInit  {
 @Input() thisAdherent:Adherent;
 @Input() Regles:ReglesPersonne;
 save:string=null;
 @Output() InfoPersoChange = new EventEmitter();
 public edit:boolean = false

ngOnInit(): void {
    this.save = JSON.stringify(this.thisAdherent.datasource); 
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

private validerChaine(
  valeur: string,
  min: number,
  max: number,
  obligatoire: boolean,
  label: string
): string | null {
  if (obligatoire && !valeur?.trim()) {
    return `${label} obligatoire`;
  }
  if (min > -1 && valeur?.length < min) {
    return `${label} trop court`;
  }
  if (max > -1 && valeur?.length > max) {
    return `${label} trop long`;
  }
  return null;
}

public lNom:string = "";
public get rNom(): boolean {
  const erreur = this.validerChaine(this.thisAdherent.Nom, this.Regles.Nom_min, this.Regles.Nom_max, this.Regles.Nom_obligatoire, $localize`Nom`);
  this.lNom = erreur ?? "";
  return !!erreur;
}

public get rPrenom(): boolean {
  const erreur = this.validerChaine(this.thisAdherent.Prenom, this.Regles.Prenom_min, this.Regles.Prenom_max, this.Regles.Prenom_obligatoire, $localize`Prénom`);
  this.lPrenom = erreur ?? "";
  return !!erreur;
}
public lPrenom:string = "";

public get rSurnom(): boolean {
  const erreur = this.validerChaine(this.thisAdherent.Surnom, this.Regles.Surnom_min, this.Regles.Surnom_max, this.Regles.Surnom_obligatoire, $localize`Surnom`);
  this.lSurnom = erreur ?? "";
  return !!erreur;
}
public lSurnom:string = "";

public get rDateNaissance(): boolean {
const erreurDateNaissance = this.validerDate(
  this.thisAdherent.DateNaissance,
  this.Regles.DateNaissance_min,
  this.Regles.DateNaissance_max,
  this.Regles.DateNaissance_obligatoire,
  $localize`Date de naissance`
);

if (erreurDateNaissance) {
  this.lDateNaissance = $localize`${erreurDateNaissance}`;
  return true;
}
return false;
}
public lDateNaissance:string = "";

private validerDate(
  valeur: Date | null,
  min: Date | null,
  max: Date | null,
  obligatoire: boolean,
  label: string
): string | null {
  if (obligatoire && !valeur) {
    return `${label} obligatoire`;
  }

  if (valeur) {
    if (min && valeur < min) {
      return `${label} trop ancienne (min : ${min.toLocaleDateString()})`;
    }

    if (max && valeur > max) {
      return `${label} trop récente (max : ${max.toLocaleDateString()})`;
    }
  }

  return null;
}


 onPhotoSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      this.thisAdherent.Photo = reader.result as string; // En base64
    };
    reader.readAsDataURL(file);
  }
}

 
}
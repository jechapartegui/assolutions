import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import type { ReglesAdresse } from '../../class/regles';
import { ValidationItem } from '@shared/lib/autres.interface';
import { GlobalService } from '../../services/global.services';
import { Adresse } from '@shared/lib/adresse.interface';

@Component({
  standalone: false,
  selector: 'app-address',
  templateUrl: './address.component.html',
  styleUrls: ['./address.component.css']
})
export class AddressComponent  implements OnInit  {
 @Input() thisAdresse:Adresse;
@Input() Regles:ReglesAdresse;
@Input() id:number;
@Input() title:string = $localize`Adresse`;
 save:string=null;
 estValid:boolean;
 @Output() InfoAdresseChange = new EventEmitter<Adresse>();
@Output() valid = new EventEmitter<boolean>();
 public edit:boolean = false

ngOnInit(): void {
  this.CheckAdresse();
    this.save = JSON.stringify(this.thisAdresse); 
}

 public Save(){
    this.InfoAdresseChange.emit(this.thisAdresse);
    this.edit = false;
 }
public Cancel(){
    this.thisAdresse = JSON.parse(this.save);
    this.edit = false;
}

public rStreet:ValidationItem;
public rPostCode:ValidationItem;
public rCity:ValidationItem;
public rLibelle:ValidationItem;


public CheckAdresse(): void {
  this.rStreet = GlobalService.instance.validerChaine(this.thisAdresse.Street, this.Regles.Street_min, this.Regles.Street_max, this.Regles.Street_obligatoire, $localize`Voie`);
  this.rPostCode= GlobalService.instance.validerChaine(this.thisAdresse.PostCode, this.Regles.PostCode_min, this.Regles.PostCode_max, this.Regles.PostCode_obligatoire, $localize`Code postal`);
  this.rCity = GlobalService.instance.validerChaine(this.thisAdresse.City, this.Regles.City_min, this.Regles.City_max, this.Regles.City_obligatoire, $localize`Ville`);
  this.estValid = this.rStreet.key && this.rPostCode.key && this.rCity.key;
  console.log('Adresse valide', this.estValid);
  if(!this.Regles.Adresse_obligatoire){
    if(!this.estValid){
      this.rLibelle = {key:false,value : $localize`Adresse non valide - vous pouvez laisser vide pour continuer `};
    }
  } else {
    this.rLibelle = {
      key: this.estValid,
      value: ''
    }
  }

  // valide si tout est bon
  // 🔥 émettre vers le parent
  this.valid.emit(this.estValid);
}
}

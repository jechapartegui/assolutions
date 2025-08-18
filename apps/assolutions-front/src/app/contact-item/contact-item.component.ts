import {  Component, Input, OnInit, EventEmitter, Output } from '@angular/core';
import type { ReglesContact } from '../../class/regles';
import { ItemContact } from '@shared/src/lib/personne.interface';
import { ValidationItem } from '@shared/src/lib/autres.interface';

@Component({
  standalone: false,
  selector: 'app-contact-item',
  templateUrl: './contact-item.component.html',
  styleUrls: ['./contact-item.component.css']
})
export class ContactItemComponent implements OnInit {
  @Input()   Contacts: ItemContact[];
 
  @Input() Regles:ReglesContact;
  @Input() Notes: string = $localize`Notes`;
  @Input() Titre: string = $localize`Contacts : `;
 @Output() ContactChange = new EventEmitter();
  @Output() valid = new EventEmitter<boolean>();

  // Exemple de méthode qui change la validité de l'email
 

  thisContact: ItemContact;
  EditIndex:number;

  constructor() { }

  ngOnInit(): void {
    this.CheckContact();
  }
  autoSave() {
    if (this.IsValid(this.thisContact)) {
      this.Save();
      this.CheckContact();
    }
  }
  

   // Exemple de méthode qui change la validité du téléphone
 

  Save() {
    if(this.EditIndex >= 0){
      this.Contacts[this.EditIndex] = this.thisContact;
    } else {
      this.Contacts.push(this.thisContact);
    }
    this.thisContact = null;
    this.EditIndex = null;
    
    this.CheckContact();
    this.ContactChange.emit(this.Contacts);
  }
  DontSave(){
    this.thisContact = null;
    this.EditIndex = null;
    this.CheckContact();
  }
  Add() {
    this.EditIndex = -1;
    let stype = 'EMAIL';
    if(this.Contacts.filter(x => x.Type == 'EMAIL').length > 0  && this.Contacts.filter(x => x.Type == 'PHONE').length == 0){
      stype = 'PHONE';
    }
    this.thisContact = {
    Type: stype,
    Value: '',
    Notes: '',
    Pref: false
  };
  }

  rNbContactMin:ValidationItem;
  rNbContactMax:ValidationItem;
  rMail:ValidationItem;
  rTel:ValidationItem;
  estValid: boolean = false;

  CheckContact() {
    let nbcontact_mail = this.Contacts.filter(contact => contact.Type === 'EMAIL').length;
    let nbcontact_tel = this.Contacts.filter(contact => contact.Type === 'PHONE').length;
    let nbcontact = this.Contacts.length;
    if(nbcontact> this.Regles.nb_contact_max){
      this.rNbContactMax = { key: false, value: $localize`Le nombre de contacts ne doit pas dépasser ${this.Regles.nb_contact_max}` };
    } else {
      this.rNbContactMax = { key: true, value: '' };
    }
    if(nbcontact< this.Regles.nb_contact_min){
      this.rNbContactMin = { key: false, value: $localize`Le nombre de contacts doit être au moins de ${this.Regles.nb_contact_min}` };
     } else {
      this.rNbContactMin = { key: true, value: '' };
    }
    if(this.Regles.mail_obligatoire && nbcontact_mail < 1){
      this.rMail = { key: false, value: $localize`Au moins un contact doit être un email` };
    } else {
      this.rMail = { key: true, value: '' };
    } 
    if(this.Regles.tel_obligatoire && nbcontact_tel < 1){
      this.rTel = { key: false, value: $localize`Au moins un contact doit être un téléphone` };
    } else {
      this.rTel = { key: true, value: '' };
    }


 this.estValid = this.rNbContactMin.key && this.rNbContactMax.key && this.rMail.key && this.rTel.key 
  // 🔥 émettre vers le parent
  this.valid.emit(this.estValid);
  //  this.ContactChange.emit(this.Contacts);

  }
  NewPref(index: number) {
    this.Contacts.forEach(contact => contact.Pref = false);
    if (index >= 0 && index < this.Contacts.length) {
      this.Contacts[index].Pref = true;
    }
    this.CheckContact();
  }

  Delete(index: number) {
    if (index >= 0 && index < this.Contacts.length) {
      this.Contacts.splice(index, 1);
    }
    this.CheckContact();
  }

  Edit(index: number) {
    if (index >= 0 && index < this.Contacts.length) {
      const clonedObject = JSON.parse(JSON.stringify(this.Contacts[index]));
      this.EditIndex = index;
      this.thisContact = clonedObject;
    }
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  IsValid(item: ItemContact): boolean {
    if (!item.Type) {
      return false;
    }
    if(this.Regles.verifier_format){
   if (item.Type == "EMAIL") {
      return this.checkIfEmailInString(item.Value);
    }
    if (item.Type == "PHONE") {
      return this.checkIfTelInstring(item.Value);
    }
    }
 
    return item.Value.length > 3;
  }


  checkIfEmailInString(text): boolean {
    var re = /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;
    return re.test(text);
  }
  checkIfTelInstring(value: string): boolean {
      // Regular expression for international or national phone numbers with optional separators
      var re = /^(\+?[0-9]{1,3}[-\s\.]?)?(\(?[0-9]{1,4}\)?[-\s\.]?)?([0-9]{1,4}[-\s\.]?[0-9]{1,9})$/;
      return re.test(value);
    }
    
}

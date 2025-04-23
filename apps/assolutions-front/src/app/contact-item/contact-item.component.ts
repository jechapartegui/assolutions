import {  Component, Input, OnInit, EventEmitter, Output } from '@angular/core';
import { ItemContact } from '../../class/contact';

@Component({
  selector: 'app-contact-item',
  templateUrl: './contact-item.component.html',
  styleUrls: ['./contact-item.component.css']
})
export class ContactItemComponent implements OnInit {
  @Input()   Contacts: ItemContact[];
  @Input() valid_mail: boolean;
  @Input() valid_tel: boolean;
  @Input() Notes: string = $localize`Notes`;
  @Input() Titre: string = $localize`Contacts : `;
  @Output() validMailChange = new EventEmitter<boolean>();
  @Output() validTelChange = new EventEmitter<boolean>();
  @Output() validContactChange = new EventEmitter<ItemContact[]>();

  // Exemple de méthode qui change la validité de l'email
 

  thisContact: ItemContact;
  EditIndex:number;

  constructor() { }

  ngOnInit(): void {
    this.CheckContact();
  }
  validateEmail(isValid: boolean) {
    this.valid_mail = isValid;
    this.validMailChange.emit(this.valid_mail);
  }
  autoSave() {
    if (this.IsValid(this.thisContact)) {
      this.Save();
    }
  }
  

  // Exemple de méthode qui change la validité du téléphone
  validateTel(isValid: boolean) {
    this.valid_tel = isValid;
    this.validTelChange.emit(this.valid_tel);
  }

   // Exemple de méthode qui change la validité du téléphone
   validateContact() {  
    this.validContactChange.emit(this.Contacts);
  }

  Save() {
    if(this.EditIndex >= 0){
      this.Contacts[this.EditIndex] = this.thisContact;
    } else {
      this.Contacts.push(this.thisContact);
    }
    this.thisContact = null;
    this.EditIndex = null;
    this.CheckContact();
  }
  DontSave(){
    this.thisContact = null;
    this.EditIndex = null;
  }
  Add() {
    this.EditIndex = -1;
    this.thisContact = new ItemContact();
  }



  CheckContact() {
    this.valid_mail = false;
    this.validateEmail(false);
    this.valid_tel = false;
    this.validateTel(false);
    this.Contacts.forEach((cont) => {
      if (this.IsValid(cont)) {
        if (cont.Type == "EMAIL") {
          this.valid_mail = true;
          this.validateEmail(true);
        }
        if (cont.Type == "PHONE") {
          this.valid_mail = true;
          this.validateTel(true);
        }
      }
    })
    this.validateContact();

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
    if (item.Type == "EMAIL") {
      return this.checkIfEmailInString(item.Value);
    }
    if (item.Type == "PHONE") {
      return this.checkIfTelInstring(item.Value);
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

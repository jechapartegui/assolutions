import { Renderer2, Component, Input, OnInit } from '@angular/core';
import { ItemContact } from 'src/class/contact';

@Component({
  selector: 'app-contact-item',
  templateUrl: './contact-item.component.html',
  styleUrls: ['./contact-item.component.css']
})
export class ContactItemComponent implements OnInit {
  @Input() datasource: string;
  @Input() valid_mail: boolean = false;
  @Input() valid_tel: boolean = false;
  Contacts: ItemContact[];

  constructor(private renderer: Renderer2) {}

  ngOnInit(): void {
    this.Contacts = JSON.parse(this.datasource);
    this.CheckContact();
  }
 
 
  CheckContact(){
    this.valid_mail = false;
    this.valid_tel = false;    
    let ToSerialize : ItemContact[] = [];
    this.Contacts.forEach((cont) =>{
      if(this.IsValid(cont)){
        ToSerialize.push(cont);
        if(cont.Type == "EMAIL"){
          this.valid_mail = true;
        }
        if(cont.Type == "PHONE"){
          this.valid_mail = true;
        }
      }
    })
  }
  NewPref(index: number) {
    this.Contacts.forEach(contact => contact.Pref = false);
    if (index >= 0 && index < this.Contacts.length) {
      this.Contacts[index].Pref = true;
    }
  }

  Delete(index: number) {
    if (index >= 0 && index < this.Contacts.length) {
      this.Contacts.splice(index, 1);
    }
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  IsValid(item :ItemContact) :boolean{
    if(item.Type == "EMAIL"){
      return this.checkIfEmailInString(item.Value);
    } 
    if(item.Type == "PHONE"){
      return this.checkIfTelInstring(item.Value);
    }
    return item.Value.length > 3;
  }


  checkIfEmailInString(text): boolean {
    var re = /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;
    return re.test(text);
  }
  checkIfTelInstring(value: string): boolean {
    var re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;
    return re.test(value);
  }
}

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Adresse } from '../../class/address';

@Component({
  selector: 'app-address',
  templateUrl: './address.component.html',
  styleUrls: ['./address.component.css']
})
export class AddressComponent  implements OnInit  {
 @Input() thisAdresse:Adresse;
 save:string=null;
 valid_adresse:boolean = false;
 @Output() InfoAdresseChange = new EventEmitter();
 public edit:boolean = false

ngOnInit(): void {
    this.save = JSON.stringify(this.thisAdresse); 
}

 public Save(){
    this.InfoAdresseChange.emit();
    this.edit = false;
 }
public Cancel(){
    this.thisAdresse = JSON.parse(this.save);
    this.edit = false;
}

 CheckAdresse() {
    this.valid_adresse = false;
    if(this.thisAdresse.Street && this.thisAdresse.City && this.thisAdresse.PostCode){
      if(this.thisAdresse.Street.length>1 && this.thisAdresse.PostCode.toString().length>4 && this.thisAdresse.City.length > 1){
        this.valid_adresse = true;
      }

    } else if(!this.thisAdresse.Street && !this.thisAdresse.City && !this.thisAdresse.PostCode){
        this.valid_adresse = true;
    }

  }

}

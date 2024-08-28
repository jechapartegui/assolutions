import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Adresse } from 'src/class/address';

@Component({
  selector: 'app-address',
  templateUrl: './address.component.html',
  styleUrls: ['./address.component.css']
})
export class AddressComponent implements OnInit {
  @Input() Adresse: Adresse;
  @Input() valid_address:boolean;
  @Output() validAdresseChange = new EventEmitter<boolean>();
  @Output() AdresseChange = new EventEmitter<Adresse>();
  
  ngOnInit(): void {
    this.CheckAdresse();
  }
  CheckAdresse() {
    this.ChangeAdresse();
    this.valid_address = false;
    this.validateAdresse(false); 
    if(this.Adresse.Street && this.Adresse.City && this.Adresse.PostCode){
      if(this.Adresse.Street.length>1 && this.Adresse.PostCode.toString().length>4 && this.Adresse.City.length > 1){
        this.validateAdresse(true); 
      }

    }

  }
  validateAdresse(isValid: boolean) {
    this.valid_address = isValid;
    this.validAdresseChange.emit(this.valid_address);
  }
  ChangeAdresse() {
    this.AdresseChange.emit(this.Adresse);
  }

}

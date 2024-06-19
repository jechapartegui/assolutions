import { EventEmitter, Injectable, Output } from "@angular/core";

export class adresse {
  public city: string;
  public name: string;
  public postcode: string;
  public country:string;
}

export class Adresse {
  public dataaddress: adresse;
  public valid: ValidationAddress = new ValidationAddress();
  constructor(_add: adresse) {
    this.dataaddress = _add;
  }

  public get Street(): string {
    return this.dataaddress.name;
  }
  public set Street(value: string) {
    this.dataaddress.name = value;
    this.valid.Update(this);
  }
  public get Postcode(): string {
    return this.dataaddress.postcode;
  }
  public set Postcode(value: string) {
    this.dataaddress.postcode = value;
    this.valid.Update(this);
  }
  public get City(): string {
    return this.dataaddress.city;
  }
  public set City(value: string) {
    this.dataaddress.city = value;
    this.valid.Update(this);
  }

  public get Country(): string {
    return this.dataaddress.country;
  }
  public set Country(value: string) {
    this.dataaddress.country = value;
    this.valid.Update(this);
  }
  
}



@Injectable({
  providedIn: 'root', // ou spécifiez un module si nécessaire
})
export class ValidationAddress  {
  @Output() onChange = new EventEmitter();
  control:boolean = false;
  city:boolean = false;
  postcode:boolean = false;
  Update(a:Adresse){
      this.control = true;
      this.postcode = false;
      if(a.Postcode){
        if(a.Postcode.length > 4){
            this.postcode = true;
        }
    }
    if(!this.postcode){
        this.control = false;
    }
    this.city = false;
      if(a.City){
          if(a.City.length > 2){
              this.city = true;
          }
      }
      if(!this.city){
          this.control = false;
      }
  this.onChange.emit();
  }

}

export class address_api {
  public label: string;
  public score: number;
  public housenumber: string;
  public id: string;
  public type: string;
  public name: string;
  public postcode: string;
  public citycode: string;
  public x: number;
  public y: number;
  public city: string;
  public importance: number;
  public street: string;
  public district: string;
  public county: string;
  public state: string;
  public country: string;
}

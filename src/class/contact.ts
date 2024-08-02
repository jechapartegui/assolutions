import { EventEmitter, Injectable, Output } from "@angular/core";
import { BehaviorSubject, Subject } from "rxjs";
import { StaticClass } from "src/app/global";
// Usage
export class Contact {
  private _Liste : LigneContact[];
  public get Liste() : LigneContact[] {
     return this._Liste;
  }
  public set Liste(v : LigneContact[]) {
    this._Liste = v;
  }

  public titre:string=$localize`Contacts`;
  public titre_notes:string=$localize`Nom de la personne à prévenir`;

  public valid:boolean = false;
  public valid_email:boolean = false;
  public valid_email_ou_phone:boolean = false;
  public valid_phone:boolean = false;
  public valid_email_et_phone:boolean = false;


  CheckAll(){
    this.valid = false;
    this.valid_email = false;
    this.valid_email_et_phone = false;
    this.valid_email_ou_phone = false;
    this.valid_phone = false;
    this.Liste.forEach((li) =>{
      li.valid.controler();
      if(li.valid.control){
        this.valid = true;
        if(li.Type == "EMAIL"){
          this.valid_email = true;
          this.valid_email_ou_phone = true;
        }
        if(li.Type == "EMAIL"){
          this.valid_phone= true;
          this.valid_email_ou_phone = true;
        }
        if(this.valid_email && this.valid_phone){
          this.valid_email_et_phone = true;
        }
      }
    })

  }



  constructor(serialized: string) {
    var LC: lignecontact[] = JSON.parse(serialized);
    this.Liste = [];
    LC.forEach(el => {
      this.Liste.push(new LigneContact(el));
    });
  }

  Extract():string{
    var LC:lignecontact[] = [];
    this.Liste.forEach(el =>{
      if(el.valid){
        LC.push(el.datacontact);
      }
    });
    return JSON.stringify(LC);
  }



}

export class lignecontact{
  public type:string = 'EMAIL';
  public preference:boolean =false;
  public value:string = "";
  public editable:boolean = true;
  public notes:string = "";
}


export class LigneContact {
  public datacontact:lignecontact;
  public temp_id:number = 0;
  thisSubject = new Subject<LigneContact>();
  public valid:Validation_LigneContact = new Validation_LigneContact(this)

  constructor(lc: lignecontact) {
    this.datacontact = lc;
  }


  public get Value(): string {
    return this.datacontact.value;
  }
  public set Value(v: string) {
    this.datacontact.value = v;
    this.thisSubject.next(this);
  }

  public get Type():string{
    return this.datacontact.type;
  }

  public set Type(v : string){
    this.datacontact.type = v;
    this.thisSubject.next(this);
  }

  public get Notes(): string {
    return this.datacontact.notes;
  }
  public set Notes(v: string) {
    this.datacontact.notes = v;
  }

  public get Editable(): boolean {
    return this.datacontact.editable;
  }
  public set Editable(v: boolean) {
    this.datacontact.editable = v;
  }

  public get Preference(): boolean {
    return this.datacontact.preference;
  }
  public set Preference(v: boolean) {
    this.datacontact.preference = v;
  }
}


@Injectable({
  providedIn: 'root', // ou spécifiez un module si nécessaire
})
export class Validation_LigneContact  {
  @Output() onChange = new EventEmitter();
  public control: boolean;

  constructor(private ligne: LigneContact) {
    this.ligne.thisSubject.subscribe((value) => this.validateValue(value));
  }

  controler() {
    this.validateValue(this.ligne);
  }

  
  private validateValue(c: LigneContact) {
    this.control = false;
    if(c.Type=='PHONE'){
      this.control = this.checkIfTelInstring(c.Value);
    }
    if(c.Type=='EMAIL'){
      this.control = this.checkIfEmailInString(c.Value);
    } 
     this.onChange.emit();
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

export class ItemContact{
  
  private _Type : string;
  public get Type() : string {
    return this._Type;
  }
  public set Type(v : string) {
    this._Type = v;
  }
  
  private _Value : string;
  public get Value() : string {
    return this._Value;
  }
  public set Value(v : string) {
    this._Value = v;
  }
  
  private _Pref : boolean;
  public get Pref() : boolean {
    return this._Pref;
  }
  public set Pref(v : boolean) {
    this._Pref = v;
  }
  
  private _Notes : string;
  public get Notes() : string {
    return this._Notes;
  }
  public set Notes(v : string) {
    this._Notes = v;
  }
  
  
  
  
}


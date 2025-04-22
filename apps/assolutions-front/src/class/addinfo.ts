import { Subject } from "rxjs";

export class addinfo{
    public id:number;
    public object_id:number;
    public object_type:string;
    public value_type:string;
    public value:string;
    public translation:string;
    public extra_fields:string;
    constructor() { }
}

export class AddInfo {
    public datasource: addinfo;
  
    public editing: boolean = false;
    public valid: ValidationAddInfo;
    // Utilisez des sujets pour chaque propriété
    object_idSubject = new Subject<number>();
    object_typeSubject = new Subject<string>();
    value_typeSubject = new Subject<string>();
    valueSubject = new Subject<string>(); // Changer le type de string à number
    translationSubject = new Subject<string>();
    extra_fieldsSubject = new Subject<string>();
  
    constructor(L: addinfo) {
      this.datasource = L;
      if (this.ID == 0) {
        this.editing = true;
      } else {
        this.editing = false;
      }
  
      this.valid = new ValidationAddInfo(this);
      this.valid.controler();
    }
    get ID(): number {
      return this.datasource.id;
    }
    set ID(value: number) {
      this.datasource.id = value;
    }
    
    public get ObjectID() : number {
        return this.datasource.object_id;
    }
    public set ObjectID(v : number) {
        this.datasource.object_id = v;
        this.object_idSubject.next(v);
    }

    public get ObjectType() : string {
        return this.datasource.object_type;
    }
    public set ObjectType(v : string) {
        this.datasource.object_type = v;
        this.object_typeSubject.next(v);
    }
    public get ValueType() : string {
        return this.datasource.value_type;
    }
    public set ValueType(v : string) {
        this.datasource.value_type = v;
        this.value_typeSubject.next(v);
    }
    public get Value() : string {
        return this.datasource.value;
    }
    public set Value(v : string) {
        this.datasource.value = v;
        this.valueSubject.next(v);
    }
    public get Translation() : string {
        return this.datasource.translation;
    }
    public set Translation(v : string) {
        this.datasource.translation = v;
        this.translationSubject.next(v);
    }
    public get ExtraFields() : string {
        return this.datasource.extra_fields;
    }
    public set ExtraFields(v : string) {
        this.datasource.extra_fields = v;
        this.extra_fieldsSubject.next(v);
    }
}
 export class ValidationAddInfo{
    control:boolean;
    constructor(L: AddInfo) {
    }
 
    controler() {
        // Méthode pour vérifier si tous les champs sont valides
        this.control = true;
    }
    
}
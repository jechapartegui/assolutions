import { Adresse } from "./adresse.interface";

export class PersonneLight_VM {
     id:number =0;
     nom:string = "";
     prenom:string = "";
     surnom:string = "";
     date_naissance:Date = new Date();
     sexe:boolean=false;
}

export class Personne_VM extends PersonneLight_VM {
    adresse: Adresse = new Adresse();
    compte:number;
    contact:ItemContact[] = [];
    contact_prevenir:ItemContact[]= [];
    login:string;
    photo:any;
    archive:boolean = false;


    get ContactPrefereType() :string {
      const contactPrefere = this.contact.find(c => c.Pref);
      return contactPrefere ? contactPrefere.Type : '';
    }
     get libelle(): string {
    const parts: string[] = [];
    if (this.prenom) parts.push(this.prenom);
    if (this.nom)     parts.push(this.nom);
    if (this.surnom)  parts.push(this.surnom);
    return parts.join(' ');
  }

  /** Appelle le getter sur *n'importe quel* objet (instance ou JSON plat). */
  static callLibelle(obj: any): string {
    const get = Object.getOwnPropertyDescriptor(Personne_VM.prototype, 'libelle')?.get;
    return get ? get.call(obj) : '';
  }

  /** Cuit la valeur sur l'objet passé (utile pour JSON / templates). */
  static bakeLibelle(obj: any): void {
    const value = Personne_VM.callLibelle(obj);
    Object.defineProperty(obj, 'libelle', {
      value,
      enumerable: true,
      configurable: true,
      writable: false
    });
  }
  }



export interface ItemContact {

  Type: string;
  Value: string;
  Notes: string;
  Pref: boolean;
}
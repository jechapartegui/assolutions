import { Adresse } from "./adresse.interface";

export class Personne_VM {
     id:number =0;
     nom:string = "";
     prenom:string = "";
     surnom:string = "";
     date_naissance:Date = new Date();
     sexe:boolean=false;
    adresse: Adresse = new Adresse();
    compte:number;
    contact:ItemContact[] = [];
    contact_prevenir:ItemContact[]= [];
    login:string;

    get ContactPrefereType() :string {
      const contactPrefere = this.contact.find(c => c.Pref);
      return contactPrefere ? contactPrefere.Type : '';
    }
    get libelle(): string {
    let parts: string[] = [];

    if (this.prenom) {
      parts.push(this.prenom);
    }

    if (this.nom) {
      parts.push(this.nom);
    }

    if (this.surnom) {
      parts.push(this.surnom);
    }

    return parts.join(' ');
  }
  }



export interface ItemContact {

  Type: string;
  Value: string;
  Notes: string;
  Pref: boolean;
}
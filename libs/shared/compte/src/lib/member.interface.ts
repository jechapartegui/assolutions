import { LienGroupe_VM } from "./groupe.interface";

export class AdherentVM{
     id:number =0;
     nom:string = "";
     prenom:string = "";
     surnom:string = "";
     date_naissance:Date = new Date();
     sexe:boolean=false;
    adresse: string;
    code_postal: string;
    ville: string;
    compte:number;
    contact:ItemContact[] = [];
    contact_prevenir:ItemContact[]= [];
    login:string;
    inscrit:boolean;
    groupes:LienGroupe_VM[] = [];
    adhesion:any[]= [];

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

export class AdherentExport {
  ID: number;
  Nom: string;
  Prenom: string;
  DDN: string;
  Sexe: boolean;
  Street: string;
  PostCode: string;
  City: string;
  Mail: string;
  MailPref: boolean;
  Phone: string;
  PhonePref: boolean;
  MailUrgence: string;
  PhoneUrgence: string;
  Surnom: string;
  Login: string;
  Country: string;
  Adhesion: boolean;
  NomMailUrgence: string;
  NomPhoneUrgence: string;
  Inscrit: boolean;

  // Unique constructeur avec un paramètre optionnel
  constructor(a?: AdherentVM) {
    if (a) {
      this.safeAssign(() => this.ID = a.id);
      this.safeAssign(() => this.Nom = a.nom);
      this.safeAssign(() => this.Prenom = a.prenom);
      this.safeAssign(() => this.Surnom = a.surnom);
      this.safeAssign(() => this.DDN = a.date_naissance.toDateString());
      this.safeAssign(() => this.Sexe = a.sexe);
      this.safeAssign(() => this.Street = a.Adresse.Street);
      this.safeAssign(() => this.PostCode = a.Adresse.PostCode);
      this.safeAssign(() => this.City = a.Adresse.City);
      this.safeAssign(() => this.Country = a.Adresse.Country);
      this.safeAssign(() => this.Mail = a.contact.filter(x => x.Type === 'EMAIL')[0]?.Value);
      this.safeAssign(() => this.MailPref = a.contact.filter(x => x.Type === 'EMAIL')[0]?.Pref);
      this.safeAssign(() => this.Phone = a.contact.filter(x => x.Type === 'PHONE')[0]?.Value);
      this.safeAssign(() => this.PhonePref = a.contact.filter(x => x.Type === 'PHONE')[0]?.Pref);
      this.safeAssign(() => this.MailUrgence = a.contact_prevenir.filter(x => x.Type === 'EMAIL')[0]?.Value);
      this.safeAssign(() => this.NomMailUrgence = a.contact_prevenir.filter(x => x.Type === 'EMAIL')[0]?.Notes);
      this.safeAssign(() => this.PhoneUrgence = a.contact_prevenir.filter(x => x.Type === 'PHONE')[0]?.Value);
      this.safeAssign(() => this.NomPhoneUrgence = a.contact_prevenir.filter(x => x.Type === 'PHONE')[0]?.Notes);

      
    } else {
      // Initialisation des propriétés à des valeurs par défaut pour un constructeur sans paramètre
      this.ID = 0;
      this.Nom = '';
      this.Prenom = '';
      this.DDN = '';
      this.Sexe = false;
      this.Street = '';
      this.PostCode = '';
      this.City = '';
      this.Mail = '';
      this.MailPref = false;
      this.Phone = '';
      this.PhonePref = false;
      this.MailUrgence = '';
      this.PhoneUrgence = '';
      this.Surnom = '';
      this.Login = '';
      this.Country = '';
      this.Adhesion = false;
      this.NomMailUrgence = '';
      this.NomPhoneUrgence = '';
      this.Inscrit = false;
    }
  }

  private safeAssign(assignFn: () => void) {
    try {
      assignFn();
    } catch (e) {
      // Gérer les exceptions
    }
  }
}
import { LienGroupe_VM } from "./groupe.interface";
import { PersonneVM } from "./personne.interface";

export class AdherentVM extends PersonneVM{
  
    inscrit:boolean;
    groupes:LienGroupe_VM[] = [];
    adhesion:any[]= [];
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
      this.safeAssign(() => this.Street = a.adresse.Street);
      this.safeAssign(() => this.PostCode = a.adresse.PostCode);
      this.safeAssign(() => this.City = a.adresse.City);
      this.safeAssign(() => this.Country = a.adresse.Country);
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
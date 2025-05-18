import { Subject } from "rxjs";
import { seance } from "./seance";
import { Groupe } from "./groupe";
import { Adresse } from "./address";
import { Adhesion } from "./adhesion";
import { FilterMenu } from "../app/menu/menu.component";
import { AdherentSeance, MesSeances } from "@shared/compte/src/lib/seance.interface";
import { adherent, ItemContact } from "@shared/compte/src/lib/member.interface";
import { inscription_seance } from "@shared/compte/src/lib/inscription_seance.interface";
import { GlobalService } from "../services/global.services";



export class Adherent {
  datasource: adherent;
  public valid: Validation_Adherent;
  public maj: boolean = true;
  
  
  
  
  sLibelle = new Subject<string>();
  dateNaissanceSubject = new Subject<string>();
  constructor(L: adherent) {
    this.datasource = L;
    this.SetLibelle(this);
    this.Contacts = this.datasource.contact;
    this.ContactsUrgence = this.datasource.contact_prevenir;
    let foundContact = this.Contacts.find(x => x.Pref === true);
    if(!foundContact){
      foundContact = this.Contacts[0];
    }
    this.ContactPrefere = foundContact ? foundContact.Value : $localize`Non saisi`;
    this.ContactPrefereType = foundContact ? foundContact.Type : null;
    this.Adresse = new Adresse();
    this.Adresse.Street = this.datasource.adresse;
    this.Adresse.PostCode = this.datasource.code_postal;
    this.Adresse.City = this.datasource.ville;
    this.valid = new Validation_Adherent(this);
    this.valid.controler();
  }
  public get ID(): number {
    return this.datasource.id;
  }
  public set ID(v: number) {
    this.datasource.id = v;
  }
  public Adhesions: Adhesion[];
  public get CompteID(): number {
    return this.datasource.compte;
  }
  public set CompteID(v: number) {
    this.datasource.compte = v;
  }
 
  public get Sexe(): boolean {
        return GlobalService.instance.getBoolean(this.datasource.sexe);
  }
  public set Sexe(v: boolean) {
    this.datasource.sexe = v;
  }
   public get Login(): string {
    return this.datasource.login;
  }
  public set Login(v: string) {
    this.datasource.login = v;
  }

  public Adresse: Adresse;

public get Inscrit() : boolean {
    return this.datasource.inscrit;
  }
  public set Inscrit(v : boolean) {
    this.datasource.inscrit = v;
  }

  public get Nom(): string {
    return this.datasource.nom;
  }
  public set Nom(v: string) {
    this.datasource.nom = v;
    this.SetLibelle(this);
  }

  public get Prenom(): string {
    return this.datasource.prenom;
  }
  public set Prenom(v: string) {
    this.datasource.prenom = v;
    this.SetLibelle(this);
  }
  // Propriété date_naissance avec get et set
  get DDN(): string {
    try {
      return this.datasource.date_naissance.toString();
    } catch (error) {
      return "0000-00-00";

    }
  }
  set DDN(value: string) {
    this.datasource.date_naissance = new Date(value);
    this.dateNaissanceSubject.next(value);
  }


  public get Surnom(): string {
    return this.datasource.surnom;
  }
  public set Surnom(v: string) {
    this.datasource.surnom = v;
    this.SetLibelle(this);
  }


  private _ContactPrefere: string;
  public get ContactPrefere(): string {
    return this._ContactPrefere;
  }
  public set ContactPrefere(v: string) {
    this._ContactPrefere = v;
  }

  private _ContactPrefereType: string;
  public get ContactPrefereType(): string {
    return this._ContactPrefereType;
  }
  public set ContactPrefereType(v: string) {
    this._ContactPrefereType = v;
  }



  public Contacts: ItemContact[];
  public ContactsUrgence: ItemContact[];





  public Libelle: string;


  public SetLibelle(adh: Adherent) {
    let t = adh.datasource;
    this.Libelle = "";
    if (t.prenom && t.prenom.length > 0) {
      this.Libelle = t.prenom;
    }
    if (t.nom && t.nom.length > 0) {
      if (this.Libelle && this.Libelle.length > 0) {
        this.Libelle = this.Libelle + " " + t.nom;
      } else {
        this.Libelle = t.nom;
      }
    }
    if (t.surnom && t.surnom.length > 0) {
      if (this.Libelle && this.Libelle.length > 0) {
        this.Libelle = this.Libelle + " " + t.surnom;
      } else {
        this.Libelle = t.surnom;
      }
    }
    this.sLibelle.next(this.Libelle);
  }



  public Groupes: Groupe[] = [];
  public inscriptions: inscription_seance[] = [];
  public seances: seance[] = [];
  public seances_prof: seance[] = [];
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
  constructor(a?: Adherent) {
    if (a) {
      this.safeAssign(() => this.ID = a.ID);
      this.safeAssign(() => this.Nom = a.Nom);
      this.safeAssign(() => this.Prenom = a.Prenom);
      this.safeAssign(() => this.Surnom = a.Surnom);
      this.safeAssign(() => this.DDN = a.DDN);
      this.safeAssign(() => this.Sexe = a.Sexe);
      this.safeAssign(() => this.Street = a.Adresse.Street);
      this.safeAssign(() => this.PostCode = a.Adresse.PostCode);
      this.safeAssign(() => this.City = a.Adresse.City);
      this.safeAssign(() => this.Country = a.Adresse.Country);
      this.safeAssign(() => this.Mail = a.Contacts.filter(x => x.Type === 'EMAIL')[0]?.Value);
      this.safeAssign(() => this.MailPref = a.Contacts.filter(x => x.Type === 'EMAIL')[0]?.Pref);
      this.safeAssign(() => this.Phone = a.Contacts.filter(x => x.Type === 'PHONE')[0]?.Value);
      this.safeAssign(() => this.PhonePref = a.Contacts.filter(x => x.Type === 'PHONE')[0]?.Pref);
      this.safeAssign(() => this.MailUrgence = a.ContactsUrgence.filter(x => x.Type === 'EMAIL')[0]?.Value);
      this.safeAssign(() => this.NomMailUrgence = a.ContactsUrgence.filter(x => x.Type === 'EMAIL')[0]?.Notes);
      this.safeAssign(() => this.PhoneUrgence = a.ContactsUrgence.filter(x => x.Type === 'PHONE')[0]?.Value);
      this.safeAssign(() => this.NomPhoneUrgence = a.ContactsUrgence.filter(x => x.Type === 'PHONE')[0]?.Notes);

      
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


export class Validation_Adherent {
  public control: boolean;
  public libelle: boolean;
  public date_naissance: boolean;

  constructor(private rider: Adherent) {

    this.rider.sLibelle.subscribe((value) => this.validateLibelle(value));
    this.rider.dateNaissanceSubject.subscribe((value) => this.validateDateNaissance(value));

  }

  controler() {
    this.control = true;
    // Appeler les méthodes de validation pour tous les champs lors de la première validation
    this.validateLibelle(this.rider.Libelle);
    this.validateDateNaissance(this.rider.datasource.date_naissance.toString());

  }
  checkcontrolvalue() {

    if (this.libelle && this.date_naissance) {
      this.control = true;
    }
  }

  private validateLibelle(value: string) {
    // Code de validation du nom
    // Mettre à jour this.nom en conséquence
    if (value) {
      if (value.length < 2) {
        this.libelle = false;
        this.control = false;
      } else {
        this.libelle = true;
        this.checkcontrolvalue();
      }
    } else {
      this.libelle = false;
      this.control = false;
    }
  }



  private validateDateNaissance(value: string) {
    // Code de validation de la date de naissance
    // Mettre à jour this.date_naissance en conséquence
    if (value) {
      if (new Date(value) > new Date()) {
        this.date_naissance = false;
        this.control = false;
      } else {
        this.date_naissance = true;
        this.checkcontrolvalue();
      }
    } else {
      this.date_naissance = false;
      this.control = false;
    }
  }


}

export class AdherentMenu  {
  constructor(_adh: AdherentSeance) {
    this.ID = _adh.id;
    this.Prenom = _adh.prenom;
    this.Nom = _adh.nom;
    this.Surnom = _adh.surnom;
    this.Sexe = _adh.sexe;
    this.DDN = _adh.dateNaissance;
    this.InscriptionSeances = _adh.mes_seances;
    this.Libelle = "";
    if (_adh.prenom && _adh.prenom.length > 0) {
      this.Libelle = _adh.prenom;
    }
    if (_adh.nom && _adh.nom.length > 0) {
      if (this.Libelle && this.Libelle.length > 0) {
        this.Libelle = this.Libelle + " " + _adh.nom;
      } else {
        this.Libelle = _adh.nom;
      }
    }
    if (_adh.surnom && _adh.surnom.length > 0) {
      if (this.Libelle && this.Libelle.length > 0) {
        this.Libelle = this.Libelle + " " + _adh.surnom;
      } else {
        this.Libelle = _adh.surnom;
      }
    }

  }

  public sort_nom = "NO";
  public sort_cours = "NO";
  public sort_date = "NO";
  public sort_lieu = "NO";
  public selected_filter: string;
  public filters = new FilterMenu();
  public InscriptionSeances: MesSeances[];
  public ID: number;
  public Libelle: string;
  public Nom:string;
  public Prenom:string;
  public Surnom:string;
  public Sexe:boolean;
  public DDN:Date;
  public Photo:string;
  public profil:"PROF" | "ADH"= "ADH";
  public afficher:boolean = false;


   
   
  //mois



  private _SeancePassee: boolean;
  public get SeancePassee(): boolean {
    return this._SeancePassee;
  }
  public set SeancePassee(v: boolean) {
    this._SeancePassee = v;
  }


  private _afficher_filtre: boolean;
  public get afficher_filtre(): boolean {
    return this._afficher_filtre;
  }
  public set afficher_filtre(v: boolean) {
    this._afficher_filtre = v;
  }
}
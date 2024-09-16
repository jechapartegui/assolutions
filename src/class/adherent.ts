import { Subject } from "rxjs";
import { seance } from "./seance";
import { Groupe, Lien_Groupe } from "./groupe";
import { inscription_seance, InscriptionSeance } from "./inscription";
import { ItemContact } from "./contact";
import { Adresse } from "./address";
import { Adhesion } from "./adhesion";

export class adherent {
  public id: number = 0;
  public prenom: string;
  public nom: string;
  public surnom: string;
  public date_naissance: string = "";
  public adresse: string = JSON.stringify(new Adresse());
  public contacts: string = "[]";
  public contacts_prevenir: string = "[]";
  public nationalite: string;
  public date_creation: Date;
  public photo: string;
  public sexe: boolean = false;
  public seances: seance[];
  public groupes: Groupe[] = [];
  public mot_de_passe: string = "";
  public compte: number = 0;
  public login: string = "";
  public inscrit:boolean = false;
  public inscriptions: inscription_seance[] = [];
  public adhesions: Adhesion[] = [];
  public seances_prof: seance[] = [];


}

export class Adherent {
  datasource: adherent;
  public valid: Validation_Adherent;
  public maj: boolean = true;
  
  
  public get Inscrit() : boolean {
    return this.datasource.inscrit;
  }
  public set Inscrit(v : boolean) {
    this.datasource.inscrit = v;
  }
  

  sLibelle = new Subject<string>();
  dateNaissanceSubject = new Subject<string>();
  constructor(L: adherent) {
    this.datasource = L;
    this.SetLibelle(this);
    this.Contacts = JSON.parse(this.datasource.contacts);
    this.ContactsUrgence = JSON.parse(this.datasource.contacts_prevenir);
    const foundContact = this.Contacts.find(x => x.Pref === true);
    this.ContactPrefere = foundContact ? foundContact.Value : $localize`Non saisi`;
    this.ContactPrefereType = foundContact ? foundContact.Type : null;
    this.Adresse = JSON.parse(this.datasource.adresse);
    this.Inscrit = L.inscrit;
    this.Adhesions = L.adhesions;
    this.Groupes = L.groupes;
    this.inscriptions = L.inscriptions;
    this.seances_prof = L.seances_prof;
    this.seances = L.seances;
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
  public get Login(): string {
    return this.datasource.login;
  }
  public set Login(v: string) {
    this.datasource.login = v;
  }
  public get Sexe(): boolean {
    return this.datasource.sexe;
  }
  public set Sexe(v: boolean) {
    this.datasource.sexe = v;
  }


  public Adresse: Adresse;



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
    this.datasource.date_naissance = value;
    this.dateNaissanceSubject.next(this.datasource.date_naissance);
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

  constructor(a: Adherent) {
    this.safeAssign(() => this.ID = a.ID);
    this.safeAssign(() => this.Nom = a.Nom);
    this.safeAssign(() => this.Prenom = a.Prenom);
    this.safeAssign(() => this.Surnom = a.Surnom);
    this.safeAssign(() => this.Login = a.Login);
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

    console.log(a.Inscrit);
    try {
      console.log(a.Inscrit);
      if (a.Inscrit) {
        this.Adhesion = true;
      }
    } catch (e) {

    }
  }

  private safeAssign(assignFn: () => void) {
    try {
      assignFn();
    } catch (e) {
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
    this.validateDateNaissance(this.rider.datasource.date_naissance);

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

export class Adherent_VM {
  public sort_nom = "NO";
  public sort_cours = "NO";
  public sort_date = "NO";
  public sort_lieu = "NO";
  public filter_date_avant: any;
  public filter_date_apres: any;
  public filter_nom: string;
  public filter_cours: number;
  public filter_groupe: number;
  public filter_lieu: number;
  public filter_prof: number;
  constructor(_adh: adherent) {
    this.datasource = _adh;

    this.afficher_filtre = false;
    this.InscriptionSeances = [];
    if (this.datasource.seances) {
      this.datasource.seances.forEach((ss) => {
        let ins = this.datasource.inscriptions.find(x => x.seance_id == ss.seance_id);
        let i = new InscriptionSeance(ss, ins, _adh.id)
        this.InscriptionSeances.push(i);
      })
    }
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
  public Libelle: string;
  public datasource: adherent;
  public InscriptionSeances: InscriptionSeance[];

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
import { Adresse } from "./address";
import { ItemContact } from "./contact";

export class professeur{
    public id:number;
    public prenom: string;
    public nom: string;
    public surnom: string;
    public date_naissance: string = "";
    public adresse: string = JSON.stringify(new Adresse());
    public contacts: string = "[]";
    public sexe: boolean = false;
    public taux:number;
    public statut:string;
    public num_tva:string;
    public num_siren:string;
    public iban:string;
    public info:string;
    public saisons:prof_saison[];
    
}
export class prof_saison{
    saison_id:number;
    rider_id:number;
    taux_horaire:number;
}

export class Professeur{
    datasource: professeur;
    constructor(L: professeur) {
    this.datasource = L;
    this.SetLibelle(this);
    this.Contacts = JSON.parse(this.datasource.contacts);
    const foundContact = this.Contacts.find(x => x.Pref === true);
    this.ContactPrefere = foundContact ? foundContact.Value : $localize`Non saisi`;
    this.ContactPrefereType = foundContact ? foundContact.Type : null;
    this.Adresse = JSON.parse(this.datasource.adresse);
      this.saisons = L.saisons;
  }
  
  public get taux() : number {
    return this.datasource.taux;
  }
  public set taux(v : number) {
    this.datasource.taux = v;
  }
  
  public get statut() : string {
    return this.datasource.statut;
  }
  public set statut(v : string) {
    this.datasource.statut = v;
  }
  
  public get num_siren() : string {
    return this.datasource.num_siren;
  }
  public set num_siren(v : string) {
    this.datasource.num_siren = v;
  }
  public get num_tva() : string {
    return this.datasource.num_tva;
  }
  public set num_tva(v : string) {
    this.datasource.num_tva = v;
  }
  public get iban() : string {
    return this.datasource.iban;
  }
  public set iban(v : string) {
    this.datasource.iban = v;
  }
  public get info() : string {
    return this.datasource.info;
  }
  public set info(v : string) {
    this.datasource.info = v;
  }
  public saisons:prof_saison[];
  public get ID(): number {
    return this.datasource.id;
  }
  public set ID(v: number) {
    this.datasource.id = v;
  }

  
  public get Sexe(): boolean {
    return this.datasource.sexe;
  }
  public set Sexe(v: boolean) {
    this.datasource.sexe = v;
  }

  
public Adresse :Adresse;
  


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
    return this.datasource.date_naissance.toString();
  }
  set DDN(value: string) {
    this.datasource.date_naissance = value;
  }


  public get Surnom(): string {
    return this.datasource.surnom;
  }
  public set Surnom(v: string) {
    this.datasource.surnom = v;
    this.SetLibelle(this);
  }

  
  private _ContactPrefere : string;
  public get ContactPrefere() : string {
    return this._ContactPrefere;
  }
  public set ContactPrefere(v : string) {
    this._ContactPrefere = v;
  }
  
  private _ContactPrefereType : string;
  public get ContactPrefereType() : string {
    return this._ContactPrefereType;
  }
  public set ContactPrefereType(v : string) {
    this._ContactPrefereType = v;
  }

  

  public Contacts : ItemContact[];
  public ContactsUrgence : ItemContact[];
  
  
  


  public Libelle: string;


  public SetLibelle(adh: Professeur) {
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
  }
}
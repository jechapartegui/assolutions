import { Subject } from "rxjs";
import { seance } from "./seance";
import { Groupe, Lien_Groupe } from "./groupe";
import { InscriptionSeance } from "./inscription";
import { Contact } from "./contact";
import { compte } from "./compte";
import { Adresse, adresse } from "./address";

export class adherent{
    public id:number;
    public prenom:string;
    public nom:string;
    public surnom:string;
    public date_naissance:Date;
    public adresse:string;
    public contacts:string= "[]";
    public contacts_prevenir:string= "[]";
    public nationalite:string;
    public date_creation:Date;
    public photo:string;
    public sexe:boolean;
    public seance:seance[];
    public groupes: Groupe[] = [];
    public mot_de_passe: string = "";
    public compte: number = 0;
    public inscriptions: InscriptionSeance[] = [];
    public seances_prof: seance[] = [];
    public ToLienGroupe(): Lien_Groupe {
      let LG = new Lien_Groupe();
      LG.objet_id = this.id;
      LG.objet_type = 'rider';
      LG.groupes = [];
      LG.groupes = this.groupes.map(x => x.id);
      return LG;
    }
}

export class Adherent{
    datasource:adherent;
    public valid: Validation_Adherent;
     
   
    sLibelle = new Subject<string>();
    constructor(L:adherent){
        this.datasource=L;
        this.Compte = new compte();
        this.Compte.id = L.compte;
        this.Contacts = new Contact(this.datasource.contacts);   
        this.Contacts_prevenir = new Contact(this.datasource.contacts_prevenir);   
        if(this.datasource.adresse){
          var add = JSON.parse(this.datasource.adresse);
          this.address_kvp = new Adresse(add);
        } else { 
          this.address_kvp = new Adresse(new adresse());
        }
        this.Adresse.valid.Update(this.Adresse);
        this.Groupes = L.groupes;  
        this.inscriptions = L.inscriptions;
        this.seances_prof = L.seances_prof;
        this.seances = L.seance;
        this.valid = new Validation_Adherent(this);
        this.valid.controler();
    }
    public get ID() : number {
        return this.datasource.id;
    }
    public set ID(v : number) {
        this.datasource.id = v;
    }
    private _compte: compte;
  public get Compte(): compte {
    return this._compte;
  }
  public set Compte(value: compte) {
    this._compte = value;
  }
    public get Nom() : string {
        return this.datasource.nom;
    }
    public set Nom(v : string) {
        this.datasource.nom = v;
        this.SetLibelle(v, this.datasource.prenom, this.datasource.surnom);
    }

    public get Prenom() : string {
        return this.datasource.prenom;
    }
    public set Prenom(v : string) {
        this.datasource.prenom = v;
        this.SetLibelle(this.datasource.nom, v, this.datasource.surnom);
    }

    public get Surnom() : string {
        return this.datasource.surnom;
    }
    public set Surnom(v : string) {
        this.datasource.surnom = v;
        this.SetLibelle(this.datasource.nom, this.datasource.prenom, v);
    }

    
    private _libelle : string;
    public get Libelle() : string {
        if(this.Prenom && this.Prenom.length>0){
            this._libelle = this.Prenom;
        }
        if(this.Nom && this.Nom.length>0){
            if(this._libelle && this._libelle.length>0){
                this._libelle = this._libelle + " " + this.Nom;
            } else {
                this._libelle = this.Nom;
            }
        }
        if(this.Surnom && this.Surnom.length>0){
            if(this._libelle && this._libelle.length>0){
                this._libelle = this._libelle + " " + this.Surnom;
            } else {
                this._libelle = this.Surnom;
            }
        }
        return this._libelle;
    }
    public set Libelle(v : string) {
        this._libelle = v;
    }
    
    
    public SetLibelle(Nom : string, Prenom:string, Surnom:string) {
        if(Prenom && Prenom.length>0){
            this.Libelle = Prenom;
        }
        if(Nom && Nom.length>0){
            if(this.Libelle && this.Libelle.length>0){
                this.Libelle = this.Libelle + " " + Nom;
            } else {
                this.Libelle = Nom;
            }
        }
        if(Surnom && Surnom.length>0){
            if(this.Libelle && this.Libelle.length>0){
                this.Libelle = this.Libelle + " " + Surnom;
            } else {
                this.Libelle = Surnom;
            }
        }
        this.sLibelle.next(this.Libelle);
    }
    
    private _contact: Contact;
  public get Contacts(): Contact {
    return this._contact;
  }
  public set Contacts(value: Contact) {
    this._contact = value;
    this.datasource.contacts = value.Extract();
  }

  private _contact_prevenir: Contact;
  public get Contacts_prevenir(): Contact {
    return this._contact_prevenir;
  }
  public set Contacts_prevenir(value: Contact) {
    this._contact_prevenir = value;
    this.datasource.contacts_prevenir = value.Extract();
  }


  private address_kvp: Adresse;
  public get Adresse(): Adresse {
    return this.address_kvp;
  }

  public set Adresse(value: Adresse) {
    this.address_kvp = value;
    this.datasource.adresse = JSON.stringify(value.dataaddress);
  }
  
  public Groupes: Groupe[] = [];
  public inscriptions: InscriptionSeance[] = [];
  public seances: seance[] = [];
  public seances_prof: seance[] = [];
}

export class Validation_Adherent{
    constructor(adh:Adherent){}
    public control:boolean;
    controler() {
        this.control = true;
        // Appeler les méthodes de validation pour tous les champs lors de la première validation
        // this.validateNom(this.rider.Nom);
        // this.validatePrenom(this.rider.Prenom);
        //  this.validateDateNaissance(this.rider.datasource.date_naissance);
       
      }

}
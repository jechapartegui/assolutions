import { Subject } from "rxjs";
import { seance } from "./seance";
import { Groupe, Lien_Groupe } from "./groupe";
import { inscription_seance, InscriptionSeance } from "./inscription";
import { Contact } from "./contact";
import { compte } from "./compte";
import { Adresse, adresse } from "./address";
import { Adhesion } from "./adhesion";

export class adherent{
    public id:number = 0;
    public prenom:string;
    public nom:string;
    public surnom:string;
    public date_naissance:string = "";
    public adresse:string;
    public contacts:string= "[]";
    public contacts_prevenir:string= "[]";
    public nationalite:string;
    public date_creation:Date;
    public photo:string;
    public sexe:boolean = false;
    public seance:seance[];
    public groupes: Groupe[] = [];
    public mot_de_passe: string = "";
    public compte_id: number = 0;
    public login: string = "";
    public inscriptions: inscription_seance[] = [];
    public adhesions: Adhesion[] = [];
    public seances_prof: seance[] = [];
    
   
}

export class Adherent{
    datasource:adherent;
    public valid: Validation_Adherent;
     
   
    sLibelle = new Subject<string>();
    dateNaissanceSubject = new Subject<string>();
    constructor(L:adherent){
        this.datasource=L;
        this.SetLibelle(this);
     
        this.Contacts = new Contact(this.datasource.contacts);   
        this.Contacts_prevenir = new Contact(this.datasource.contacts_prevenir);   
        if(this.datasource.adresse){
          var add = JSON.parse(this.datasource.adresse);
          this.address_kvp = new Adresse(add);
        } else { 
          this.address_kvp = new Adresse(new adresse());
        }
        this.Adhesions = L.adhesions;
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
    public Adhesions:Adhesion[];
    public get CompteID() : number {
        return this.datasource.compte_id;
    }
    public set CompteID(v : number) {
        this.datasource.compte_id = v;
    }
    public get Login() : string {
        return this.datasource.login;
    }
    public set Login(v : string) {
        this.datasource.login = v;
    }
    public get Sexe() : boolean {
        return this.datasource.sexe;
    }
    public set Sexe(v : boolean) {
        this.datasource.sexe = v;
    }

    
    public get Nom() : string {
        return this.datasource.nom;
    }
    public set Nom(v : string) {
        this.datasource.nom = v;
        this.SetLibelle(this);
    }

    public get Prenom() : string {
        return this.datasource.prenom;
    }
    public set Prenom(v : string) {
        this.datasource.prenom = v;
        this.SetLibelle(this);
    }
 // Propriété date_naissance avec get et set
 get DDN(): string {
    return this.datasource.date_naissance.toString();
  }
  set DDN(value: string) {
    this.datasource.date_naissance = value;
   this.dateNaissanceSubject.next(this.datasource.date_naissance);
  }


    public get Surnom() : string {
        return this.datasource.surnom;
    }
    public set Surnom(v : string) {
        this.datasource.surnom = v;
        this.SetLibelle(this);
    }

    
    public Libelle:string;
    
    
    public SetLibelle(adh:Adherent) {
        let t = adh.datasource;
        this.Libelle = "";
        if(t.prenom && t.prenom.length>0){
            this.Libelle = t.prenom;
        }
        if(t.nom && t.nom.length>0){
            if(this.Libelle && this.Libelle.length>0){
                this.Libelle = this.Libelle + " " + t.nom;
            } else {
                this.Libelle = t.nom;
            }
        }
        if(t.surnom && t.surnom.length>0){
            if(this.Libelle && this.Libelle.length>0){
                this.Libelle = this.Libelle + " " + t.surnom;
            } else {
                this.Libelle = t.surnom;
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
  public inscriptions: inscription_seance[] = [];
  public seances: seance[] = [];
  public seances_prof: seance[] = [];
}

export class Validation_Adherent{
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

export class Adherent_VM{
  constructor (_adh:adherent){
    this.datasource = _adh;
    this.Mois = 1;
    this.SeancePassee = false;
    this.afficher_filtre = false;
    this.InscriptionSeances = [];
    if(this.datasource.seance){
      this.datasource.seance.forEach((ss) =>{
        let ins = this.datasource.inscriptions.find(x => x.seance_id == ss.seance_id);
        let i = new InscriptionSeance(ss, ins, _adh.id)
        this.InscriptionSeances.push(i);
      })
    }
      this.Libelle = "";
      if(_adh.prenom && _adh.prenom.length>0){
          this.Libelle = _adh.prenom;
      }
      if(_adh.nom && _adh.nom.length>0){
          if(this.Libelle && this.Libelle.length>0){
              this.Libelle = this.Libelle + " " + _adh.nom;
          } else {
              this.Libelle = _adh.nom;
          }
      }
      if(_adh.surnom && _adh.surnom.length>0){
          if(this.Libelle && this.Libelle.length>0){
              this.Libelle = this.Libelle + " " + _adh.surnom;
          } else {
              this.Libelle = _adh.surnom;
          }
      }
    
  

  }
  public Libelle:string;
  public datasource:adherent;
  public InscriptionSeances:InscriptionSeance[];
  
  //mois

  private _Mois : number;
  public get Mois() : number {
    return this._Mois;
  }
  public set Mois(v : number) {
    this._Mois = v;
  }
  
  
  private _SeancePassee : boolean;
  public get SeancePassee() : boolean {
    return this._SeancePassee;
  }
  public set SeancePassee(v : boolean) {
    this._SeancePassee = v;
  }

  
  private _afficher_filtre : boolean;
  public get afficher_filtre() : boolean {
    return this._afficher_filtre;
  }
  public set afficher_filtre(v : boolean) {
    this._afficher_filtre = v;
  }
  



  


}
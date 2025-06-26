import { Subject } from 'rxjs';
import { Adresse } from './address';
import { Groupe } from './groupe';
import { Saison } from './saison';
import { Lieu } from './lieu';
import { project_login } from '../services/login.nest.service';
import { compte } from '@shared/src/lib/compte.interface';


export class projet {
  public id: number = 0;
  public nom: string = "";
  public lang: string = "";
  public date_debut: Date = new Date();
  public actif: boolean = true;
  public mail_relance: string = "";
  public mail_annulation: string = "";
  public mail_convocation: string = "";
  public sujet_annulation: string = "";
  public sujet_relance: string = "";
  public sujet_convocation: string = "";
  public prix: number = 0;
  public date_fin: Date | null = null;
  public password: string = "";
  public contact: string = "[]";
  public adresse_facturation: string = "";
  public libelle_facturation: string = "";
  public activite: string = "";
  public pays:string = "FR";
  public groupe:Groupe[] = [];
  public place_maximum:boolean = true;
  public saison_active:number=0;
  public essai_possible:boolean=false;
  public convocation_nominative:boolean=false;
  public mail_relance_actif:boolean=false;
  constructor(public pr: project_login) {
    this.id = pr.id;
    this.actif = pr.actif;
    this.nom = pr.nom;
    this.saison_active = pr.active_saison;
    // Initialize any other properties if needed
  }
}

export class Projet {

  constructor(P: projet) {
    this.datasource = P;
    if (this.ID == 0) {
      this.editing = true;
    } else {
      this.editing = false;
    }

    this.valid = new ValidationProjet(this);
    this.valid.controler();
    this.Saisons = [];
    this.Lieux = [];
    this.Groupes = [];
  }

  nomSubject = new Subject<string>();
  dateDebutSubject = new Subject<Date>();
  libelleFacturationSubject = new Subject<string>();
  activiteSubject = new Subject<string>();
  mailSubject = new Subject<string>();
  adresseSubject = new Subject<Adresse>();

  public get ID(): number {
    return this.datasource.id;
  }
  public set ID(value: number) {
    this.datasource.id = value;
  }


  public editing: boolean = false;
  public valid: ValidationProjet;
  public datasource: projet;


   get nom(): string {
    return this.datasource.nom;
  }
  set nom(value: string) {
    this.datasource.nom = value;
    this.nomSubject.next(value);
  }

  get date_debut(): Date {
    return this.datasource.date_debut;
  }
  set date_debut(value: Date) {
    this.datasource.date_debut = value;
    this.dateDebutSubject.next(value);
  }


  private compte: compte;
  public get Compte(): compte {
    return this.compte;
  }
  public set Compte(value: compte) {
    this.compte = value;
  }


  get libelle_facturation(): string {
    return this.datasource.libelle_facturation;
  }
  set libelle_facturation(value: string) {
    this.datasource.libelle_facturation = value;
    this.libelleFacturationSubject.next(value);
  }

  get activite(): string {
    return this.datasource.activite;
  }
  set activite(value: string) {
    this.datasource.activite = value;
    this.activiteSubject.next(value);
  }

  get Lang(): string {
    return this.datasource.lang;
  }
  set Lang(value: string) {
    this.datasource.lang = value;
  }
  get Actif(): boolean {
    return this.datasource.actif;
  }
  set Actif(value: boolean) {
    this.datasource.actif = value;
  }
  get Mail_Relance(): string {
    return this.datasource.mail_relance;
  }
  set Mail_Relance(value: string) {
    this.datasource.mail_relance = value;
  }
  get Mail_Annulation(): string {
    return this.datasource.mail_annulation;
  }
  set Mail_Annulation(value: string) {
    this.datasource.mail_annulation = value;
  }
  get Mail_Convocation(): string {
    return this.datasource.mail_convocation;
  }
  set Mail_Convocation(value: string) {
    this.datasource.mail_convocation = value;
  }
  get Sujet_Relance(): string {
    return this.datasource.sujet_relance;
  }
  set Sujet_Relance(value: string) {
    this.datasource.sujet_relance = value;
  }
  get Sujet_Annulation(): string {
    return this.datasource.sujet_annulation;
  }
  set Sujet_Annulation(value: string) {
    this.datasource.sujet_annulation = value;
  }
  get Sujet_Convocation(): string {
    return this.datasource.sujet_convocation;
  }
  set Sujet_Convocation(value: string) {
    this.datasource.sujet_convocation = value;
  }
  get Prix(): number {
    return this.datasource.prix;
  }
  set Prix(value: number) {
    this.datasource.prix = value;
  }
  get Date_Fin(): Date | null {
    return this.datasource.date_fin;
  }
  set Date_Fin(value: Date | null) {
    this.datasource.date_fin = value;
  }
  set Password(value: string) {
    this.datasource.password = value;
  }
  get Password(): string {
    return this.datasource.password;
  }
  set Pays(value: string) {
    this.datasource.pays = value;
  }
  get Pays(): string {
    return this.datasource.pays;
  }
  
  set Convocation_Nominative(value: boolean) {
    this.datasource.convocation_nominative = value;
  }
  get Convocation_Nominative(): boolean {
    return this.datasource.convocation_nominative;
  }

  set Place_Maximum(value: boolean) {
    this.datasource.place_maximum = value;
  }
  get Place_Maximum(): boolean {
    return this.datasource.place_maximum;
  }
  set Essai_Possible(value: boolean) {
    this.datasource.essai_possible = value;
  }
  get Essai_Possible(): boolean {
    return this.datasource.essai_possible;
  }
  set Mail_Relance_Actif(value: boolean) {
    this.datasource.mail_relance_actif = value;
  }
  get Mail_Relance_Actif(): boolean {
    return this.datasource.mail_relance_actif;
  }
  set Groupes(value: Groupe[]) {
    this.datasource.groupe = value;
  }
  get Groupes(): Groupe[] {
    return this.datasource.groupe;
  }
  saisons:Saison[];
  set Saisons  (value: Saison[]) {
    this.saisons = value;
  }
  get Saisons(): Saison[] {
    return this.saisons;
  }
  
  lieux:Lieu[];
  set Lieux  (value: Lieu[]) {
    this.lieux = value;
  }
  get Lieux(): Lieu[] {
    return this.lieux;
  }


}

export class ValidationProjet {
  public control: boolean;
  public nom: boolean;
  public date_debut: boolean;
  public libelle_facturation: boolean;
  public activite: boolean;
  public contact:boolean;
  public adresse:boolean;

  constructor(private projet_vm: Projet) {
    this.projet_vm.nomSubject.subscribe((value) => this.validateNom(value));
    this.projet_vm.dateDebutSubject.subscribe((value) => this.validateDateDebut(value));
    this.projet_vm.libelleFacturationSubject.subscribe((value) => this.validateLibelleFacturation(value));
    this.projet_vm.activiteSubject.subscribe((value) => this.validateActivite(value));
  }

  controler() {
    this.control = true;
    this.validateNom(this.projet_vm.nom);
    this.validateDateDebut(this.projet_vm.date_debut);
    this.validateLibelleFacturation(this.projet_vm.libelle_facturation);
    this.validateActivite(this.projet_vm.activite);
  }

  checkControlValue() {
    if (
      this.nom &&
      this.date_debut &&
      this.libelle_facturation &&
      this.activite &&
      this.contact && 
      this.adresse  
    ) {
      this.control = true;
    }
  }


  private validateNom(value: string) {
    if (value) {
      if (value.length < 6) {
        this.nom = false;
        this.control = false;
      } else {
        this.nom = true;
        this.checkControlValue();
      }
    } else {
      this.nom = false;
      this.control = false;
    }
  }

  private validateDateDebut(value: Date) {
    if (value) {
      // Add your specific date validation logic here
      this.date_debut = true; // For now, consider it always valid
      this.checkControlValue();
    } else {
      this.date_debut = false;
      this.control = false;
    }
  }

 

  private validateLibelleFacturation(value: string) {
    // Add your specific libelle_facturation validation logic here
    if (value) {
      if (value.length < 6) {
        this.libelle_facturation = false;
        this.control = false;
      } else {
        this.libelle_facturation = true;
        this.checkControlValue();
      }
    } else {
      this.libelle_facturation = false;
      this.control = false;
    }
    this.checkControlValue();
  }

  private validateActivite(value: string) {
    // Add your specific activite validation logic here
    if (value) {
      if (value.length < 6) {
        this.activite = false;
        this.control = false;
      } else {
        this.activite = true;
        this.checkControlValue();
      }
    } else {
      this.activite = false;
      this.control = false;
    }
    this.checkControlValue();
  }
}


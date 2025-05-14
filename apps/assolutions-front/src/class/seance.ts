import { Subject } from "rxjs";
import { Groupe, Lien_Groupe } from "./groupe";
import { KeyValuePair } from "@shared/compte/src/lib/autres.interface";

export class seance {
    public seance_id:number =0;
    public cours: number = 0;
    public saison_id: number = 0;
    public date_seance: Date = new Date();
    public heure_debut: string = "";
    public duree_seance: number = 0;
    public lieu_id: number= 0;
    public lieu: string;
    public libelle:string;
    public statut:StatutSeance=StatutSeance.prévue;
    public professeurs: KeyValuePair[]= [];
    public age_minimum:number =0 ;
    public age_maximum:number =99 ;
    public groupes: Groupe[] = [];
    public place_maximum:number =-1;
    public essai_possible:boolean=false;
    public convocation_nominative :boolean=false;
    public est_place_maximum:boolean=false;
    public est_limite_age_minimum:boolean=false;
    public est_limite_age_maximum:boolean=false;
    public type_seance:string;
    public afficher_present:boolean = false;
    public notes:string="";
    public info_seance:string="";
  constructor() {
    
  }

  ToLienGroupe() : Lien_Groupe{
    let LG = new Lien_Groupe();
    LG.objet_id = this.seance_id;
    LG.objet_type = 'cours';
    LG.groupes = this.groupes.map( x => x.id);
    return LG;
  }
}


export class Seance {
  public datasource: seance;

  public editing: boolean = false;
  public valid: ValidationSeance;
  // Utilisez des sujets pour chaque propriété
  nomSubject = new Subject<string>();
  jour_semaineSubject = new Subject<string>();
  heureSubject = new Subject<string>();
  dureeSubject = new Subject<number>(); // Changer le type de string à number
  lieu_idSubject = new Subject<number>();
  saison_idSubject = new Subject<number>();
  age_minimumSubject = new Subject<number>(); // Ajout du sujet pour la propriété age_minimum
  age_maximumSubject = new Subject<number>(); // Ajout du sujet pour la propriété age_maximum
  place_maximumSubject = new Subject<number>(); // Ajout du sujet pour la propriété place_maximum
  libelleSubject = new Subject<string>();
  dateSubject = new Subject<Date>();
 
  constructor(L: seance) {
    this.datasource = L;
    if (this.ID == 0) {
      this.editing = true;
    } else {
      this.editing = false;
    }

    this.valid = new ValidationSeance(this);
    this.valid.controler();
  }
  get ID(): number {
    return this.datasource.seance_id;
  }
  set ID(value: number) {
    this.datasource.seance_id = value;
  }
 

  // Utilisez des sujets pour chaque propriété

  get TypeSeance(): string {
    return this.datasource.type_seance;
  }
  set TypeSeance(value: string) {
    this.datasource.type_seance = value;
  }


  get AfficherPresent(): boolean {
    return this.datasource.afficher_present;
  }
  set AfficherPresent(value: boolean) {
    this.datasource.afficher_present = value;
  }
  // Propriété nom avec get et set
  get libelle(): string {
    return this.datasource.libelle;
  }
  set libelle(value: string) {
    this.datasource.libelle = value;
    this.libelleSubject.next(value);
  }
  get date_seance(): Date {
    return this.datasource.date_seance;
  }
  set date_seance(value: Date) {
    this.datasource.date_seance = value;
    this.dateSubject.next(value);
  }
  get heure_debut(): string {
    return this.datasource.heure_debut;
  }
  set heure_debut(value: string) {
    this.datasource.heure_debut = value;
    this.heureSubject.next(value);
  }
  get duree_seance(): number {
    return this.datasource.duree_seance;
  }
  set duree_seance(value: number) {
    this.datasource.duree_seance = value;
    this.dureeSubject.next(value);
  }

  get Lieu(): string {
    return this.datasource.lieu;
  }
  set Lieu(value: string) {
    this.datasource.lieu = value;
  }
  get LieuId(): number {
    return this.datasource.lieu_id;
  }
  set LieuId(value: number) {
    this.datasource.lieu_id = value;
    this.lieu_idSubject.next(value);
  }
  get Groupes(): Groupe[] {
    return this.datasource.groupes;
  }
  set Groupes(value: Groupe[]) {
    this.datasource.groupes = value;
  }
  get AgeMinimum(): number {
    if(this.datasource.age_minimum == -1){
      this.datasource.age_minimum = 1;
      return 1;
    } else {
      return this.datasource.age_minimum;
    }
  }
  set AgeMinimum(value: number) {
    this.datasource.age_minimum = value;
    this.age_minimumSubject.next(value);
  }

  // Propriété age_maximum avec get et set
  get AgeMaximum(): number {
    if(this.datasource.age_maximum == -1){
      this.datasource.age_maximum = 99;
      return 99;
    } else {
      return this.datasource.age_maximum;
    }
  }
  set AgeMaximum(value: number) {
    this.datasource.age_maximum = value;
    this.age_maximumSubject.next(value);
  }

  // Propriété place_maximum avec get et set
  get PlaceMaximum(): number {
    if(this.datasource.place_maximum == -1){
      this.datasource.place_maximum = 25;
      return 25;
    } else {
      return this.datasource.place_maximum;
    }
  }
  set PlaceMaximum(value: number) {
    this.datasource.place_maximum = value;
    this.place_maximumSubject.next(value);
  }

  get EstPlaceMaximum(): boolean {
    return this.datasource.est_place_maximum;
  }
  set EstPlaceMaximum(value: boolean) {
    this.datasource.est_place_maximum = value;
  }
  get EstAgeMinimum(): boolean {
    return this.datasource.est_limite_age_minimum;
  }
  set EstAgeMinimum(value: boolean) {
    this.datasource.est_limite_age_minimum = value;
  }
  get EstAgeMaximum(): boolean {
    return this.datasource.est_limite_age_maximum;
  }
  set EstAgeMaximum(value: boolean) {
    this.datasource.est_limite_age_maximum = value;
  }

  // Propriété convocation_nominative avec get et set
  get ConvocationNominative(): boolean {
    return this.datasource.convocation_nominative;
  }
  set ConvocationNominative(value: boolean) {
    this.datasource.convocation_nominative = value;
  }
  get professeurs(): any[] {
    return this.datasource.professeurs;
  }
  set professeurs(value:  any[] ) {
    this.datasource.professeurs = value;
  }

    get Cours(): number {
      return this.datasource.cours;
    }
    set Cours(value: number) {
      this.datasource.cours = value;
    }
    get Statut(): StatutSeance {
      return this.datasource.statut;
    }
    set Statut(value: StatutSeance) {
      this.datasource.statut = value;
    }

    get EssaiPossible(): boolean {
      return this.datasource.essai_possible;
    }
    set EssaiPossible(value: boolean) {
      this.datasource.essai_possible = value;
    }
    get Notes(): string {
      return this.datasource.notes;
    }
    set Notes(value: string) {
      this.datasource.notes = value;
    }
    get InfoSeance(): string {
      return this.datasource.notes;
    }
    set InfoSeance(value: string) {
      this.datasource.notes = value;
    }
    public MailAnnulation:boolean = false;

}

export class ValidationSeance {
  public control: boolean;
  public libelle: boolean;
  public date: boolean;
  public heure: boolean;
  public duree: boolean;
  public lieu: boolean;

  constructor(private seance: Seance) {

    this.seance.libelleSubject.subscribe((value) => this.validateLibelle(value));
    this.seance.dateSubject.subscribe((value) => this.validateDate(value));
    this.seance.heureSubject.subscribe((value) => this.validateHeure(value));
    this.seance.dureeSubject.subscribe((value) => this.validateDuree(value));
    this.seance.lieu_idSubject.subscribe((value) => this.validateLieu(value));
    
  }

  controler() {
    this.control = true;
    // Appeler les méthodes de validation pour tous les champs lors de la première validation
    this.validateLibelle(this.seance.libelle);
    this.validateDate(this.seance.date_seance);
    this.validateHeure(this.seance.heure_debut);
    this.validateDuree(this.seance.duree_seance);
    this.validateLieu(this.seance.LieuId);
    
  }

  private validateLibelle(value: string) {
    // Code de validation du nom
    // Mettre à jour this.nom en conséquence
    if (value) {
      if (value.length < 6) {
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

  private validateDate(value: Date) {
    // Code de validation de la date de naissance
    // Mettre à jour this.date_naissance en conséquence
    if (value) {
      if (value > new Date()) {
        this.date = false;
        this.control = false;
      } else {
        this.date = true;
        this.checkcontrolvalue();
      }
    } else {
      this.date = false;
      this.control = false;
    }
  }

  private validateHeure(value: string) {
    // Code de validation du nom
    // Mettre à jour this.nom en conséquence
    if (value) {
      if (value.length < 3 || value.length>10) {
        this.heure = false;
        this.control = false;
      } else {
        this.heure = true;
        this.checkcontrolvalue();
      }
    } else {
      this.heure = false;
      this.control = false;
    }
  }

  private validateDuree(value: number) {
    // Code de validation du nom
    // Mettre à jour this.nom en conséquence
    if (value) {
      if (value < 1 || value > 2880) {
        this.duree = false;
        this.control = false;
      } else {
        this.duree = true;
        this.checkcontrolvalue();
      }
    } else {
      this.duree = false;
      this.control = false;
    }
  }

  private validateLieu(value: number) {
    // Code de validation du nom
    // Mettre à jour this.nom en conséquence
    if (value) {
      if (value < 1) {
        this.lieu = false;
        this.control = false;
      } else {
        this.lieu = true;
        this.checkcontrolvalue();
      }
    } else {
      this.lieu = false;
      this.control = false;
    }
  }

 

  
  checkcontrolvalue() {
      if (this.libelle && this.date && this.heure && this.duree && this.lieu) {
        this.control = true;
      }  
  }
}

export enum StatutSeance{
  prévue='prévue', réalisée= 'réalisée', annulée ='annulée'
}

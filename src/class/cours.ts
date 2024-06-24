import { Subject } from "rxjs";
import { Groupe, Lien_Groupe } from "./groupe";

export class cours {

  public id: number = 0;
  public nom: string = "";
  public jour_semaine: string = "dimanche";
  public heure: string = "";
  public duree: number = 0;
  public prof_principal_id: number = 0;
  public prof_principal_nom: string = "";
  public lieu_id: number = 0;
  public lieu_nom: string = "";
  public age_minimum: number = 0;
  public age_maximum: number = 99;
  public saison_id: number = 0;
  public place_maximum: number = 10;
  public groupes: Groupe[] = [];
  public type_cours: "ENTRAINEMENT" | "MATCH" | "SORTIE" | "EVENEMENT" = "ENTRAINEMENT";
  public convocation_nominative :boolean=false;
  public afficher_present :boolean=false;
  public est_place_maximum:boolean=false;
  public est_limite_age_minimum:boolean=false;
  public est_limite_age_maximum:boolean=false;

  constructor() { }
  ToLienGroupe() : Lien_Groupe{
    let LG = new Lien_Groupe();
    LG.objet_id = this.id;
    LG.objet_type = 'cours';
    LG.groupes = this.groupes.map( x => x.id);
    return LG;
  }  

}
export class Cours {
  public datasource: cours;

  public editing: boolean = false;
  public valid: ValidationCours;
  // Utilisez des sujets pour chaque propriété
  nomSubject = new Subject<string>();
  jour_semaineSubject = new Subject<string>();
  heureSubject = new Subject<string>();
  dureeSubject = new Subject<number>(); // Changer le type de string à number
  prof_principal_idSubject = new Subject<number>();
  lieu_idSubject = new Subject<number>();
  saison_idSubject = new Subject<number>();
  age_requisSubject = new Subject<number>(); // Ajout du sujet pour la propriété age_requis
  age_maximumSubject = new Subject<number>(); // Ajout du sujet pour la propriété age_maximum
  place_maximumSubject = new Subject<number>(); // Ajout du sujet pour la propriété place_maximum
  convocation_nominativeSubject = new Subject<boolean>(); // Ajout du sujet pour la propriété convocation_nominative
  typeCoursSubject = new Subject<"ENTRAINEMENT" | "MATCH" | "SORTIE" | "EVENEMENT">();
  constructor(L: cours) {
    this.datasource = L;
    if (this.ID == 0) {
      this.editing = true;
    } else {
      this.editing = false;
    }

    this.valid = new ValidationCours(this);
    this.valid.controler();
  }
  get ID(): number {
    return this.datasource.id;
  }
  set ID(value: number) {
    this.datasource.id = value;
  }

  // Propriété nom avec get et set
  get Nom(): string {
    return this.datasource.nom;
  }
  set Nom(value: string) {
    this.datasource.nom = value;
    this.nomSubject.next(value);
  }

  get TypeCours(): "ENTRAINEMENT" | "MATCH" | "SORTIE" | "EVENEMENT" {
    return this.datasource.type_cours;
  }
  set TypeCours(value: "ENTRAINEMENT" | "MATCH" | "SORTIE" | "EVENEMENT") {
    this.datasource.type_cours = value;
    this.typeCoursSubject.next(value);
  }


  get AfficherPresent(): boolean {
    return this.datasource.afficher_present;
  }
  set AfficherPresent(value: boolean) {
    this.datasource.afficher_present = value;
  }
  // Propriété jour_semaine avec get et set
  get JourSemaine(): string {
    return this.datasource.jour_semaine;
  }
  set JourSemaine(value: string) {
    this.datasource.jour_semaine = value;
    this.jour_semaineSubject.next(value);
  }

  // Propriété heure avec get et set
  get Heure(): string {
    return this.datasource.heure;
  }
  set Heure(value: string) {
    this.datasource.heure = value;
    this.heureSubject.next(value);
  }

  // Propriété duree avec get et set
  get Duree(): number {
    return this.datasource.duree;
  }
  set Duree(value: number) {
    this.datasource.duree = value;
    this.dureeSubject.next(value);
  }

  // Propriété prof_principal_id avec get et set
  get ProfPrincipalId(): number {
    return this.datasource.prof_principal_id;
  }
  set ProfPrincipalId(value: number) {
    this.datasource.prof_principal_id = value;
    this.prof_principal_idSubject.next(value);
  }

  // Propriété lieu_id avec get et set
  get LieuId(): number {
    return this.datasource.lieu_id;
  }
  set LieuId(value: number) {
    this.datasource.lieu_id = value;
    this.lieu_idSubject.next(value);
  }

  // Propriété saison_id avec get et set
  get SaisonId(): number {
    return this.datasource.saison_id;
  }
  set SaisonId(value: number) {
    this.datasource.saison_id = value;
    this.saison_idSubject.next(value);
  }

  // Propriété age_requis avec get et set
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
    this.age_requisSubject.next(value);
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
    this.convocation_nominativeSubject.next(value);
  }
  get Groupes(): Groupe[] {
    return this.datasource.groupes;
  }
  set Groupes(value: Groupe[]) {
    this.datasource.groupes = value;
  }

}


export class ValidationCours {
  public control: boolean;
  public nom: boolean;
  public heure: boolean;
  public duree: boolean;
  public lieu: boolean;
  public prof: boolean;
  public saison: boolean;
  public jour_semaine: boolean;

  constructor(private cours: Cours) {
    // Abonnement aux sujets pour les mises à jour des valeurs
    this.cours.nomSubject.subscribe((value) => this.validateNom(value));
    this.cours.dureeSubject.subscribe((value) => this.validateDuree(value));
    this.cours.heureSubject.subscribe((value) => this.validateHeure(value));
    this.cours.jour_semaineSubject.subscribe((value) => this.validateJourSemaine(value));
    this.cours.saison_idSubject.subscribe((value) => this.validateSaison(value));
    this.cours.lieu_idSubject.subscribe((value) => this.validateLieu(value));
    this.cours.prof_principal_idSubject.subscribe((value) => this.validateProf(value));
  }

  controler() {
    // Méthode pour vérifier si tous les champs sont valides
    this.control = true;
    // Appeler les méthodes de validation pour tous les champs lors de la première validation
    this.validateNom(this.cours.Nom);
    this.validateDuree(this.cours.Duree);
    this.validateHeure(this.cours.Heure);
    this.validateJourSemaine(this.cours.JourSemaine);
    this.validateSaison(this.cours.SaisonId);
    this.validateLieu(this.cours.LieuId);
    this.validateProf(this.cours.ProfPrincipalId);
  }

  private validateNom(value: string) {
    // Validation du nom
    if (value && value.length >= 2) {
      this.nom = true;
    } else {
      this.nom = false;
      this.control = false;
    }
    this.checkControlValue();
  }

  private validateHeure(value: string) {
    // Validation de l'heure (considérée comme valide si non nulle)
    this.heure = !!value;
    this.checkControlValue();
  }

  private validateDuree(value: number) {
    // Validation de la durée (considérée comme valide si supérieure à zéro)
    this.duree = value > 0;
    this.checkControlValue();
  }

  private validateJourSemaine(value: string) {
    // Validation du jour de la semaine (considéré comme valide si non nul)
    this.jour_semaine = !!value;
    this.checkControlValue();
  }

  private validateSaison(value: number) {
    // Validation de la saison (considérée comme valide si supérieure à zéro)
    this.saison = value > 0;
    this.checkControlValue();
  }

  private validateLieu(value: number) {
    // Validation du lieu (considéré comme valide si supérieur à zéro)
    this.lieu = value > 0;
    this.checkControlValue();
  }

  private validateProf(value: number) {
    // Validation du professeur (considéré comme valide si supérieur à zéro)
    this.prof = value > 0;
    this.checkControlValue();
  }

  private checkControlValue() {
    // Vérifie si tous les champs sont valides
    if (this.nom && this.heure && this.duree && this.jour_semaine && this.saison && this.lieu && this.prof) {
      this.control = true;
    } else {
      this.control = false;
    }
  }
}



import { Groupe } from "./groupe";
import { KeyValuePair } from "./keyvaluepair";

export class Inscription {

      public id: number = 0;
      public rider_id: number;
      public seance_id: number;
      public date_inscription: Date = new Date();
      public statut: StatutPresence = StatutPresence.Présent;


}
export enum StatutPresence {
      Présent = "présent",
      Absent = "absent",
      Convoqué = "convoqué",
      NonInscrit = "non inscrit",
  
}

export class InscriptionSeance {
      public id: number = 0;
      public rider_id: number;
      public seance_id: number;
      public date_inscription: Date = new Date();
      public statut: StatutPresence = StatutPresence.Présent;
      public date_seance: Date;
      public heure_debut: string;
      public duree_seance: number;
      public lieu: string;
      public libelle: string;
      public professeurs: KeyValuePair[] = [];
      public rider_libelle: string = "";
      public edit: boolean = false;
      public hors_liste:boolean=false;
      public contact_urgence: string = "";
      public statut_seance?: StatutPresence = null ;
      public info_seance:string = "";
      public groupes:Groupe[] = [];

      public constructor(inscription?:Inscription){
            if(inscription){
                  this.id = inscription.id;
                  this.rider_id = inscription.rider_id;
                  this.seance_id = inscription.seance_id;
                  this.date_inscription = inscription.date_inscription;
                  this.statut = inscription.statut;
                  this.statut_seance = null;
                  this.hors_liste = true;
                        }
      }
}




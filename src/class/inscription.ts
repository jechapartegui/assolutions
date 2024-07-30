import { Groupe } from "./groupe";
import { KeyValuePair } from "./keyvaluepair";
import { seance } from "./seance";

export class inscription_seance {

      public id: number = 0;
      public rider_id: number;
      public seance_id: number;
      public date_inscription: Date = new Date();
      public statut_inscription: StatutPresence = null;
      public statut_seance: StatutPresence = null;


}
export enum StatutPresence {
      Présent = "présent",
      Absent = "absent",
      Convoqué = "convoqué"

}


export class InscriptionSeance {
      public thisSeance: seance;
      public thisInscription: inscription_seance;

      public constructor(seance: seance, inscription: inscription_seance, rider_id:number) {
            this.thisSeance = seance;

            if (inscription) {
                  this.thisInscription = inscription;
            } else {
                  this.thisInscription = new inscription_seance();
                  this.thisInscription.id = 0;
                  this.thisInscription.date_inscription = null;
                  this.thisInscription.rider_id = rider_id;
                  this.thisInscription.seance_id = seance.seance_id;
                  this.thisInscription.statut_inscription = null;
                  this.thisInscription.statut_seance = null;
            }

      }
}




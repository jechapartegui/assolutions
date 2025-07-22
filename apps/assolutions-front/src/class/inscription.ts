import {  InscriptionSeance_VM } from "@shared/src/lib/inscription_seance.interface";
import { Seance_VM, } from "@shared/src";



export class InscriptionSeance {
      public thisSeance: Seance_VM;
      public thisInscription: InscriptionSeance_VM;

      public constructor(seance: Seance_VM, inscription: InscriptionSeance_VM, rider_id: number) {
            this.thisSeance = seance;

            if (inscription) {
                  this.thisInscription = inscription;
            } else {
                this.thisInscription = {
                  id: 0,
                  date_inscription: null,
                  rider_id: rider_id,
                  seance_id: seance.seance_id,
                  statut_inscription: null,
                  statut_seance: null,
                  };

            }

      }
}




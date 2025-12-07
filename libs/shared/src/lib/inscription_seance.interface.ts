import { Personne_VM } from "./personne.interface";

export class InscriptionSeance_VM {
  rider_id = 0;
  seance_id = 0;
  date_inscription: Date | null = null;
  statut_inscription: InscriptionStatus_VM | null = null;
  statut_seance: SeanceStatus_VM | null = null;
}


export class FullInscriptionSeance_VM extends InscriptionSeance_VM {

    person: Personne_VM;
    isVisible:boolean = true; 
}

export enum InscriptionStatus_VM {
  PRESENT = 'présent',
  ABSENT = 'absent',
  CONVOQUE = 'convoqué',
  ESSAI = 'essai',
}

export enum SeanceStatus_VM {
  PRESENT = 'présent',
  ABSENT = 'absent',
}


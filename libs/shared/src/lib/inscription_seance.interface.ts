import { Personne_VM } from "./personne.interface";

export class InscriptionSeance_VM {
    id: number;
     rider_id: number;
     seance_id: number;
     date_inscription: Date;
     statut_inscription: InscriptionStatus_VM | undefined;
     statut_seance: SeanceStatus_VM | undefined;
}


export class FullInscriptionSeance_VM {

    id: number;
    person: Personne_VM;
    seance_id: number;
    date_inscription: Date;
    statut_inscription: InscriptionStatus_VM | undefined;
    statut_seance: SeanceStatus_VM | undefined;
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


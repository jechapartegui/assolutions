export interface inscription_seance {
    id: number;
     rider_id: number;
     seance_id: number;
     date_inscription: Date;
     statut_inscription: StatutPresence;
     statut_seance: StatutPresence;
}

export enum StatutPresence {
    Présent = "présent",
    Absent = "absent",
    Convoqué = "convoqué",
    Essai = "essai"
}

export interface full_inscription_seance {

    id: number;
    rider_id: number;
    seance_id: number;
    date_inscription: Date;
    statut_inscription: StatutPresence;
    statut_seance: StatutPresence;
    nom: string;
    prenom: string;
    surnom: string;
    contacts: string;
    contacts_prevenir: string;


}


import { ItemContact } from "./personne.interface";

export interface InscriptionSeance_VM {
    id: number;
     rider_id: number;
     seance_id: number;
     date_inscription: Date;
     statut_inscription: string | undefined;
     statut_seance: string | undefined;
}


export interface FullInscriptionSeance_VM {

    id: number;
    rider_id: number;
    seance_id: number;
    date_inscription: Date;
    statut_inscription: string | undefined;
    statut_seance: string | undefined;
    nom: string;
    prenom: string;
    surnom: string;
    contacts: ItemContact[];
    contacts_prevenir: ItemContact[];


}


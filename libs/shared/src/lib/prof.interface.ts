import { PersonneLight_VM } from "./personne.interface";

export class Professeur_VM  {
    person : PersonneLight_VM;
    taux: number| undefined;
    statut: string| undefined;
    num_tva: string| undefined;
    num_siren: number| undefined;
    iban: string | undefined;
    info: string| undefined;
}

export class ProfSaisonVM {
    prof_id:number;
    saison_id: number;
}
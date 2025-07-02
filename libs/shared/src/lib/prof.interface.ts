export class ProfVM {
    id: number;
    nom: string;
    prenom: string;
    surnom: string;
}

export class ProfesseurVM extends ProfVM {
    taux: number;
    statut: string;
    num_tva: string;
    num_siren: number;
    iban: string;
    info: string;
}

export class ProfSaisonVM {
    prof_id:number;
    saison_id: number;
}
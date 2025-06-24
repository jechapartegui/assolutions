export interface ProfVM {
    id: number;
    nom: string;
    prenom: string;
    surnom: string;
}

export interface ProfesseurVM extends ProfVM {
    taux: number;
    statut: string;
    num_tva: string;
    num_siren: number;
    iban: string;
    info: string;
}
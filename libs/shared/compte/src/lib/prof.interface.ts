export interface prof {
    id: number;
    nom: string;
    prenom: string;
    surnom: string;
}

export interface professeur extends prof {
    taux: number;
    statut: string;
    num_tva: string;
    num_siren: number;
    iban: string;
    info: string;
}
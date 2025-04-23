export interface compte {
    id: number;
    nom: string;
    email: string;
    password: string;
    actif: boolean;
    mail_actif: boolean;
    derniere_connexion: Date;
    echec_connexion: number;
    mail_ko: boolean;
  }
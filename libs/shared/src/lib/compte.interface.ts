export class Compte_VM {
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

  export class ProjetLogin {
    id: number;
    nom: string;
    actif: boolean;
    date_debut: Date;
    password: string;
    login: string;
  }

  export type AuthResult = {
    type: 'compte' | 'admin';
    user: any;
  };

  export type ProjetView = {
    id: number;
    nom: string;
    adherent: boolean;
    prof: boolean;
    gestionnaire: boolean;
  };

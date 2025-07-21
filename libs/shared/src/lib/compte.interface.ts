import { Adherent_VM } from "./member.interface";

export class Compte_VM {
    id: number;
    nom: string;
    email: string;
    password: string;
    actif: boolean;
    mail_actif: boolean;
    derniere_connexion: Date | null;
    echec_connexion: number;
    mail_ko: boolean;
    token: string | null;
    adherents: Adherent_VM[] = [];
  }

  export class ProjetLogin {
    id: number;
    nom: string;
    actif: boolean;
    date_debut: Date;
    password: string;
    login: string;
  }

  

  export type ProjetView = {
    id: number;
    nom: string;
    adherent: boolean;
    prof: boolean;
    essai:boolean;
  };

import { Adherent_VM } from "./member.interface";
import { Saison_VM } from "./saison.interface";

export class Compte_VM {
    id: number = 0;
    nom: string;
    email: string;
    password: string| null;
    actif: boolean = false;
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
    saison_active:Saison_VM | null;
  };

  export type MeResponse = {
  compte: Compte_VM;
  projects: ProjetView[];
  token: string;
  mode: AppMode;
};

export type PreLoginResponse = {
  mode: AppMode;
  password_required: boolean;
};

export type AppMode = "APPLI" | "ADMIN";

export type ProjectRights = {
  adherent: boolean;
  prof: boolean;
  essai: boolean;
};

export type Session = {
  token: string;
  mode: AppMode;                 // APPLI ou ADMIN (admin => menu/admin routes)
  compte: Compte_VM;
  projects: ProjetView[];        // liste de choix
  selectedProjectId: number | null;
  rights: ProjectRights | null;  // droits du projet sélectionné (ProjectView)
};


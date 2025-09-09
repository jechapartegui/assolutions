import { Adresse } from "./adresse.interface";
import { ItemContact } from "./personne.interface";

export class Projet_VM {
  id: number;
  nom: string;
  actif: boolean;
  date_debut: Date;
  date_fin: Date;
  contacts?: ItemContact[];
  adresse?: Adresse;
  activite?: string;
  langue?: string;
  logo?: string;
  couleur?: string;
  login: string;
    token: string | null;
}
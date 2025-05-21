import { KeyValuePair } from "./autres.interface";

export interface cours {
  id: number;
  nom: string;
  saison_id: number;
  afficher_present: boolean;
  age_maximum: number;
  age_minimum: number;
  convocation_nominative: boolean;
  duree: number;
  est_limite_age_maximum: boolean;
  est_limite_age_minimum: boolean;
  est_place_maximum: boolean;
  heure: string;
  lieu_id: number;
  jour_semaine: string;
  place_maximum: number;
  prof_principal_id: number;
  profs : KeyValuePair[];
  groupes : KeyValuePair[];
}

export function initCours(): cours {
  return {
    id: 0,
    nom: '',
    saison_id: 0,
    afficher_present: false,
    age_maximum: 0,
    age_minimum: 0,
    convocation_nominative: false,
    duree: 0,
    est_limite_age_maximum: false,
    est_limite_age_minimum: false,
    est_place_maximum: false,
    heure: '', // format attendu ? (ex: "18:30")
    lieu_id: 0,
    jour_semaine: '', // ou par défaut "Lundi" ?
    place_maximum: 0,
    prof_principal_id: 0,
    profs: [],
    groupes: [],
  };
}

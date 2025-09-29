// types/regles-formulaire.model.ts


export interface ReglesFormulaire {
  InfoPerso_Adherent: ReglesPersonne;
  Adresse_Adherent: ReglesAdresse;
  InfoPerso_Essai: ReglesPersonne;
  Adresse_Essai: ReglesAdresse;
  Contact_Adherent: ReglesContact;
  Contact_Essai: ReglesContact;
  Contact_Pref_Adherent: ReglesContact;
  Contact_Pref_Essai: ReglesContact;
  Seance_DateLieu: ReglesDateLieu;
  SeanceSerie_DateLieu: ReglesDateLieu;
  Cours_DateLieu: ReglesDateLieu;
  Cours_Parametres: ReglesSeance;
  Seance_Parametres: ReglesSeance;
}

export interface ReglesPersonne {
  Nom_min: number;
  Nom_max: number;
  Nom_obligatoire: boolean;
  Prenom_min: number;
  Prenom_max: number;
  Prenom_obligatoire: boolean;
  Surnom_min: number;
  Surnom_max: number;
  Surnom_obligatoire: boolean;
  Libelle_min: number;
  Libelle_max: number;
  DateNaissance_obligatoire: boolean;
  DateNaissance_min: Date | null;
  DateNaissance_max: Date | null;
  Photo_obligatoire: boolean;
}

export interface ReglesAdresse {
  Street_min: number;
  Street_max: number;
  Street_obligatoire: boolean;
  PostCode_min: number;
  PostCode_max: number;
  PostCode_obligatoire: boolean;
  City_min: number;
  City_max: number;
  City_obligatoire: boolean;
  Adresse_obligatoire: boolean;
}


export interface ReglesContact {
  nb_contact_min: number;
  nb_contact_max: number;
  verifier_format: boolean;
  mail_obligatoire: boolean;
  tel_obligatoire: boolean;
}
export interface ReglesDateLieu {
  date_dans_saison:boolean;
  date_min: Date | null;
  date_max: Date | null;
  heure_min: string;
  heure_max: string;
  date_obligatoire: boolean;
  heure_obligatoire:boolean;
  lieu_obligatoire:boolean;
  creneau_obligatoire:boolean;
  duree_obligatoire:boolean;
  duree_min: number;
  duree_max: number;
}
export  interface ReglesSeance {
  age_min: boolean;
  age_min_valeur_min: number;
  age_min_valeur_max: number;
  age_max: boolean;
  age_max_valeur_min: number;
  age_max_valeur_max: number;
  place_limite: boolean;
  place_limite_valeur_min: number;
  place_limite_valeur_max: number;
  vis_essai_possible: boolean; // si true, on affiche le bouton "essai" dans la liste des caractéristiques
  vis_afficher_present: boolean; // si true, on affiche le bouton "essai" dans la liste des caractéristiques
}

// types/regles-formulaire.model.ts

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

export interface ReglesFormulaire {
  InfoPerso_Adherent: ReglesPersonne;
  Adresse_Adherent: ReglesAdresse;
  InfoPerso_Essai: ReglesPersonne;
  Adresse_Essai: ReglesAdresse;
  Contact_Adherent: ReglesContact;
  Contact_Essai: ReglesContact;
  Contact_Pref_Adherent: ReglesContact;
  Contact_Pref_Essai: ReglesContact;
}

export interface ReglesContact {
  nb_contact_min: number;
  nb_contact_max: number;
  verifier_format: boolean;
  mail_obligatoire: boolean;
  tel_obligatoire: boolean;
}
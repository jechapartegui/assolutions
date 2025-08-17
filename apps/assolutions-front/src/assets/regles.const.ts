// constants/regles.const.ts

import { ReglesFormulaire } from "../class/regles";

export const REGLES_PAR_DEFAUT: ReglesFormulaire = {
  InfoPerso_Adherent: {
    Nom_min: -1,
    Nom_max: -1,
    Nom_obligatoire: false,
    Prenom_min: -1,
    Prenom_max: -1,
    Prenom_obligatoire: false,
    Surnom_min: -1,
    Surnom_max: -1,
    Surnom_obligatoire: false,
    Libelle_min: 3,
    Libelle_max: -1,
    DateNaissance_obligatoire: true,
    DateNaissance_min: null,
    DateNaissance_max: null,
    Photo_obligatoire: false
  },
  Adresse_Adherent: {
    Street_min: -1,
    Street_max: -1,
    Street_obligatoire: true,
    PostCode_min: 4,
    PostCode_max: -1,
    PostCode_obligatoire: true,
    City_min: -1,
    City_max: -1,
    City_obligatoire: true,
    Adresse_obligatoire: true
  },
  InfoPerso_Essai: {
    Nom_min: 1,
    Nom_max: -1,
    Nom_obligatoire: true,
    Prenom_min: 1,
    Prenom_max: -1,
    Prenom_obligatoire: true,
    Surnom_min: -1,
    Surnom_max: -1,
    Surnom_obligatoire: false,
    Libelle_min: 3,
    Libelle_max: -1,
    DateNaissance_obligatoire: true,
    DateNaissance_min: null,
    DateNaissance_max: null,
    Photo_obligatoire: false
  },
  Adresse_Essai: {
    Street_min: -1,
    Street_max: -1,
    Street_obligatoire: true,
    PostCode_min: 4,
    PostCode_max: -1,
    PostCode_obligatoire: true,
    City_min: -1,
    City_max: -1,
    City_obligatoire: true,
    Adresse_obligatoire: true
  }, 
  Contact_Adherent: {
    nb_contact_min: 2,
    nb_contact_max: 5,  
    verifier_format: true,
    mail_obligatoire: true,
    tel_obligatoire: true
  },
  Contact_Essai: {
    nb_contact_min: 2,
    nb_contact_max: 5,  
    verifier_format: true,
    mail_obligatoire: true,
    tel_obligatoire: true
  },
  Contact_Pref_Adherent: {
    nb_contact_min: -1,
    nb_contact_max: 5,  
    verifier_format: true,
    mail_obligatoire: false,
    tel_obligatoire: false
  },
  Contact_Pref_Essai: {
    nb_contact_min: -1,
    nb_contact_max: 5,  
    verifier_format: true,
    mail_obligatoire: false,
    tel_obligatoire: false
  },
  Cours_DateLieu: {
    date_dans_saison: false,
    date_min: null,
    date_max: null,
    creneau_obligatoire: true,
    heure_obligatoire: true,
    duree_obligatoire: true,
    lieu_obligatoire: true,
    duree_min: 10,
    duree_max: 1880, // 31 heures
    heure_min: null,
    heure_max: null,
    date_obligatoire: false,
  }, Seance_DateLieu: {
    date_dans_saison: true,
    date_min: null,
    date_max: null,
    creneau_obligatoire: false,
    heure_obligatoire: true,
    duree_obligatoire: true,
    lieu_obligatoire: true,
    duree_min: 10,
    duree_max: 1880, // 31 heures
    heure_min: null,
    heure_max: null,
    date_obligatoire: true,
  },
  SeanceSerie_DateLieu: {
    date_dans_saison: true,
    date_min: null,
    date_max: null,
    creneau_obligatoire: true,
    heure_obligatoire: true,
    duree_obligatoire: true,
    lieu_obligatoire: true,
    duree_min: 10,
    duree_max: 1880, // 31 heures
    heure_min: null,
    heure_max: null,
    date_obligatoire: true,
  },
  Cours_Parametres: {
    age_min: false,
    age_min_valeur_min: -1,
    age_min_valeur_max: -1,
    age_max: false,
    age_max_valeur_min: -1,
    age_max_valeur_max: -1,
    place_limite: false,
    place_limite_valeur_min: -1,
    place_limite_valeur_max: -1,
    vis_afficher_present:false,
    vis_essai_possible: true, // si true, on affiche le bouton "essai" dans la liste des caractéristiques
  },
  Seance_Parametres: {
    age_min: false,
    age_min_valeur_min: -1,
    age_min_valeur_max: -1,
    age_max: false,
    age_max_valeur_min: -1,
    age_max_valeur_max: -1,
    place_limite: false,
    place_limite_valeur_min: -1,
    place_limite_valeur_max: -1,
    vis_essai_possible: true,
    vis_afficher_present:true, // si true, on affiche le bouton "essai" dans la liste des caractéristiques
  },
};

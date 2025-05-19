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
    Street_obligatoire: false,
    PostCode_min: 4,
    PostCode_max: -1,
    PostCode_obligatoire: false,
    City_min: -1,
    City_max: -1,
    City_obligatoire: false
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
    City_obligatoire: true
  }
};

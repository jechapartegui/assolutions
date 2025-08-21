"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContratProfesseur_VM = exports.Cours_VM = void 0;
class Cours_VM {
    constructor() {
        this.id = 0;
        this.heure = "11:00";
        this.duree = 0;
        this.prof_principal_id = 0;
        this.lieu_id = 0;
        this.saison_id = 0;
        this.essai_possible = false;
        this.convocation_nominative = false;
        this.afficher_present = false;
        this.est_limite_age_minimum = false;
        this.est_limite_age_maximum = false;
        this.est_place_maximum = false;
        this.rdv = "";
        // Professeurs liés
        this.professeursCours = [];
        // Groupes liés
        this.groupes = [];
    }
}
exports.Cours_VM = Cours_VM;
class ContratProfesseur_VM {
}
exports.ContratProfesseur_VM = ContratProfesseur_VM;

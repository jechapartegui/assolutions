"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeanceProfesseur_VM = exports.StatutSeance = exports.Seance_VM = void 0;
exports.calculerHeureFin = calculerHeureFin;
// shared/models/seance.dto.ts
class Seance_VM {
    constructor() {
        this.seance_id = 0;
        this.cours = 0;
        this.libelle = "";
        this.date_seance = new Date();
        this.heure_debut = "11:00";
        this.duree_seance = 0;
        this.lieu_id = 0;
        this.statut = 'prévue';
        this.age_minimum = null;
        this.age_maximum = null;
        this.place_maximum = null;
        this.essai_possible = false;
        this.info_seance = "";
        this.convocation_nominative = false;
        this.afficher_present = false;
        this.rdv = "";
        this.est_limite_age_minimum = false;
        this.est_limite_age_maximum = false;
        this.est_place_maximum = false;
        // Les entités de lien
        this.seanceProfesseurs = [];
        this.groupes = []; // Liste des groupes liés à la séance
    }
}
exports.Seance_VM = Seance_VM;
var StatutSeance;
(function (StatutSeance) {
    StatutSeance["pr\u00E9vue"] = "pr\u00E9vue";
    StatutSeance["r\u00E9alis\u00E9e"] = "r\u00E9alis\u00E9e";
    StatutSeance["annul\u00E9e"] = "annul\u00E9e";
})(StatutSeance || (exports.StatutSeance = StatutSeance = {}));
class SeanceProfesseur_VM {
}
exports.SeanceProfesseur_VM = SeanceProfesseur_VM;
function calculerHeureFin(heureDebut, dureeMinutes) {
    const [hours, minutes] = heureDebut.split(':').map(Number);
    const debut = new Date();
    debut.setHours(hours, minutes, 0, 0);
    // Ajoute la durée
    debut.setMinutes(debut.getMinutes() + dureeMinutes);
    // Reformate en "HH:MM"
    const heure = debut.getHours().toString().padStart(2, '0');
    const minute = debut.getMinutes().toString().padStart(2, '0');
    return `${heure}:${minute}`;
}

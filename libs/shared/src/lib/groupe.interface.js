"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Groupe_VM = exports.LienGroupe_VM = void 0;
class LienGroupe_VM {
    constructor(id, nom, id_lien) {
        this.id = id;
        this.nom = nom;
        this.id_lien = id_lien;
    }
}
exports.LienGroupe_VM = LienGroupe_VM;
class Groupe_VM {
    constructor(id, nom, saison_id) {
        this.display = false; // Pour l'affichage dans la liste
        this.id = id;
        this.nom = nom;
        this.saison_id = saison_id;
    }
}
exports.Groupe_VM = Groupe_VM;

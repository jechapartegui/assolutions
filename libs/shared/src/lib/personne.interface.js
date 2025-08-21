"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Personne_VM = exports.PersonneLight_VM = void 0;
const adresse_interface_1 = require("./adresse.interface");
class PersonneLight_VM {
    constructor() {
        this.id = 0;
        this.nom = "";
        this.prenom = "";
        this.surnom = "";
        this.date_naissance = new Date();
        this.sexe = false;
    }
}
exports.PersonneLight_VM = PersonneLight_VM;
class Personne_VM extends PersonneLight_VM {
    constructor() {
        super(...arguments);
        this.adresse = new adresse_interface_1.Adresse();
        this.contact = [];
        this.contact_prevenir = [];
    }
    get ContactPrefereType() {
        const contactPrefere = this.contact.find(c => c.Pref);
        return contactPrefere ? contactPrefere.Type : '';
    }
    get libelle() {
        let parts = [];
        if (this.prenom) {
            parts.push(this.prenom);
        }
        if (this.nom) {
            parts.push(this.nom);
        }
        if (this.surnom) {
            parts.push(this.surnom);
        }
        return parts.join(' ');
    }
}
exports.Personne_VM = Personne_VM;

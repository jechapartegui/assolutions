"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdherentExport = exports.Adherent_VM = void 0;
const personne_interface_1 = require("./personne.interface");
class Adherent_VM extends personne_interface_1.Personne_VM {
    constructor() {
        super(...arguments);
        this.inscrit = false;
        this.inscriptionsSaison = [];
        this.inscriptionsSeance = [];
    }
}
exports.Adherent_VM = Adherent_VM;
class AdherentExport {
    // Unique constructeur avec un paramètre optionnel
    constructor(a) {
        if (a) {
            this.safeAssign(() => this.ID = a.id);
            this.safeAssign(() => this.Nom = a.nom);
            this.safeAssign(() => this.Prenom = a.prenom);
            this.safeAssign(() => this.Surnom = a.surnom);
            this.safeAssign(() => this.DDN = a.date_naissance.toDateString());
            this.safeAssign(() => this.Sexe = a.sexe);
            this.safeAssign(() => this.Street = a.adresse.Street);
            this.safeAssign(() => this.PostCode = a.adresse.PostCode);
            this.safeAssign(() => this.City = a.adresse.City);
            this.safeAssign(() => this.Country = a.adresse.Country);
            this.safeAssign(() => this.Mail = a.contact.filter(x => x.Type === 'EMAIL')[0]?.Value);
            this.safeAssign(() => this.MailPref = a.contact.filter(x => x.Type === 'EMAIL')[0]?.Pref);
            this.safeAssign(() => this.Phone = a.contact.filter(x => x.Type === 'PHONE')[0]?.Value);
            this.safeAssign(() => this.PhonePref = a.contact.filter(x => x.Type === 'PHONE')[0]?.Pref);
            this.safeAssign(() => this.MailUrgence = a.contact_prevenir.filter(x => x.Type === 'EMAIL')[0]?.Value);
            this.safeAssign(() => this.NomMailUrgence = a.contact_prevenir.filter(x => x.Type === 'EMAIL')[0]?.Notes);
            this.safeAssign(() => this.PhoneUrgence = a.contact_prevenir.filter(x => x.Type === 'PHONE')[0]?.Value);
            this.safeAssign(() => this.NomPhoneUrgence = a.contact_prevenir.filter(x => x.Type === 'PHONE')[0]?.Notes);
        }
        else {
            // Initialisation des propriétés à des valeurs par défaut pour un constructeur sans paramètre
            this.ID = 0;
            this.Nom = '';
            this.Prenom = '';
            this.DDN = '';
            this.Sexe = false;
            this.Street = '';
            this.PostCode = '';
            this.City = '';
            this.Mail = '';
            this.MailPref = false;
            this.Phone = '';
            this.PhonePref = false;
            this.MailUrgence = '';
            this.PhoneUrgence = '';
            this.Surnom = '';
            this.Login = '';
            this.Country = '';
            this.Adhesion = false;
            this.NomMailUrgence = '';
            this.NomPhoneUrgence = '';
            this.Inscrit = false;
        }
    }
    safeAssign(assignFn) {
        try {
            assignFn();
        }
        catch (e) {
            // Gérer les exceptions
        }
    }
}
exports.AdherentExport = AdherentExport;

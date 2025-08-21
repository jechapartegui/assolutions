"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeanceStatus_VM = exports.InscriptionStatus_VM = exports.FullInscriptionSeance_VM = exports.InscriptionSeance_VM = void 0;
class InscriptionSeance_VM {
}
exports.InscriptionSeance_VM = InscriptionSeance_VM;
class FullInscriptionSeance_VM extends InscriptionSeance_VM {
    constructor() {
        super(...arguments);
        this.isVisible = true;
    }
}
exports.FullInscriptionSeance_VM = FullInscriptionSeance_VM;
var InscriptionStatus_VM;
(function (InscriptionStatus_VM) {
    InscriptionStatus_VM["PRESENT"] = "pr\u00E9sent";
    InscriptionStatus_VM["ABSENT"] = "absent";
    InscriptionStatus_VM["CONVOQUE"] = "convoqu\u00E9";
    InscriptionStatus_VM["ESSAI"] = "essai";
})(InscriptionStatus_VM || (exports.InscriptionStatus_VM = InscriptionStatus_VM = {}));
var SeanceStatus_VM;
(function (SeanceStatus_VM) {
    SeanceStatus_VM["PRESENT"] = "pr\u00E9sent";
    SeanceStatus_VM["ABSENT"] = "absent";
})(SeanceStatus_VM || (exports.SeanceStatus_VM = SeanceStatus_VM = {}));

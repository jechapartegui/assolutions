import { compte } from "@shared/compte/src/lib/compte.interface";

export class Login_VM {
    compte: compte;
    mdp_requis = false;
    projets: {id:number, nom:string, admin:boolean}[] = null;

    constructor(_c: compte = null) {
        this.compte = _c ?? {
            id: 0,
            email: "",
            password: "",
            nom: "",
            mail_actif: false,
            actif: false,
            echec_connexion: 0,
            derniere_connexion: null,
            mail_ko: false
        };
    }

    get Login(): string {
        return this.compte.email;
    }
    set Login(v: string) {
        this.compte.email = v;
    }

    get Password(): string {
        return this.compte.password;
    }
    set Password(v: string) {
        this.compte.password = v;
    }

    // VALIDATION SIMPLIFIÉE
    get isLoginValid(): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.Login);
    }

    get isPasswordValid(): boolean {
        if (!this.mdp_requis) return true;
        return this.Password.length >= 8 && /[0-9]/.test(this.Password) && /[!@#$%^&*(),.?":{}|<>]/.test(this.Password);
    }

    get isValid(): boolean {
        return this.isLoginValid && this.isPasswordValid;
    }
}

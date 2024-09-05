import { Subject } from "rxjs";
import { adherent, Adherent } from "./adherent";

export class compte {
    public id: number = 0;
    public login: string = "";
    public password: string;
    public libelle: string;
    public date_creation: string;
    public actif: boolean;
    public mail_actif: boolean;
    public derniere_connexion: Date;
    public echec_connexion: number;
    public mail_ko: boolean;
    public activation_token: string;
    public est_password: boolean;
    public riders:adherent[];
    public projet_compte:projet_compte[];


}

export class Compte {
    datasource: compte;
    login_S = new Subject<string>();
    password_S = new Subject<string>();
    constructor(_c: compte) {
        this.datasource = _c;
        this.valid = new Validation_Compte(this);
        this.valid.controler();
    }
    public valid: Validation_Compte;

    public get Login(): string {
        return this.datasource.login;
    }
    public set Login(v: string) {
        this.datasource.login = v;
        this.login_S.next(v);
    }


    public get Password(): string {
        return this.datasource.password;
    }
    public set Password(v: string) {
        this.datasource.password = v;
        this.password_S.next(v);
    }



}

export class Validation_Compte {
    public control: boolean;
    public login: boolean;
    public password: boolean;

    constructor(private compte: Compte) {

        this.compte.login_S.subscribe((value) => this.validateLogin(value));
        this.compte.password_S.subscribe((value) => this.validatePassword(value));

    }

    controler() {
        this.control = true;
        // Appeler les méthodes de validation pour tous les champs lors de la première validation
        this.validateLogin(this.compte.Login);
        this.validatePassword(this.compte.Password);

    }
    checkcontrolvalue() {

        if (this.login && this.password) {
            this.control = true;
        }
    }
    checkIfEmailInString(text): boolean {
        const emailRegEx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;  
        return emailRegEx.test(text);
    }
    checkFormatPsw(password: string): boolean {

        const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z0-9!@#$%^&*(),.?":{}|<>]{8,}$/;

        return passwordRegex.test(password);
    }
    private validateLogin(value: string) {
        // Code de validation du nom
        // Mettre à jour this.nom en conséquence
        if (value && value.length > 7) {
            if (this.checkIfEmailInString(value)) {
                this.login = true;
                this.checkcontrolvalue();
            } else {
                this.login = false;
                this.control = false;
            }
        } else {
            this.login = false;
            this.control = false;
        }
    }

    private validatePassword(value: string) {
        // Code de validation du prénom
        // Mettre à jour this.prenom en conséquence
        if (value && value.length > 8) {
            if (this.checkFormatPsw(value)) {
                this.password = true;
                this.checkcontrolvalue();
            } else {
                this.password = false;
                this.control = false;
            }
        } else {
            this.password = false;
            this.control = false;
        }
    }
}

export class projet_compte{
    public id:number;
    public droit:number;
    public date_connexion_toker:Date;
}
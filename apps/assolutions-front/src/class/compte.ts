import { compte } from "@shared/compte/src/lib/compte.interface";
import { Subject } from "rxjs";

export class Login_VM {
    compte: compte;
    mdp_requis: boolean = false;
    projets: {id:number, nom:string, admin:boolean} [] = null;
    login_S = new Subject<string>();
    password_S = new Subject<string>();
    constructor(_c: compte = null) {
        if(_c == null) {
            this.compte = {
                id: 0,
                email: "",
                password: "",
                nom: "",
                mail_actif : false,
                actif: false,
                echec_connexion: 0,
                derniere_connexion:null,
                mail_ko: false
            };
        } else {
            this.compte = _c;
        }
        this.valid = new Validation_Compte(this);
        this.valid.controler();
    }
    public valid: Validation_Compte;

    public get Login(): string {
        return this.compte.email;
    }
    public set Login(v: string) {
        this.compte.email = v;
        this.login_S.next(v);
    }

    public get Password(): string {
        return this.compte.password;
    }
    public set Password(v: string) {
        this.compte.password = v;
        this.password_S.next(v);
    }
}

export class Validation_Compte {
    public control: boolean;
    public login: boolean;
    public password: boolean;

    constructor(private LVM: Login_VM) {
        this.LVM.login_S.subscribe((value) => this.validateLogin(value));
        this.LVM.password_S.subscribe((value) => this.validatePassword(value));
        }

    controler() {
        this.control = true;
        // Appeler les méthodes de validation pour tous les champs lors de la première validation
        this.validateLogin(this.LVM.Login);
        this.validatePassword(this.LVM.Password);

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

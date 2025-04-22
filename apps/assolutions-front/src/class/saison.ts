import { Injectable} from "@angular/core";
import { Subject } from "rxjs";
import { Type_Adhesion } from "./adhesion";

export class saison {
    public id: number = 0;
    public nom: string = "";
    public active: boolean = false;
    public date_debut: Date;
    public date_fin: Date;
    public type_adhesions:string="[]";
}
@Injectable({
    providedIn: 'root', // ou spécifiez un module si nécessaire
})
export class Saison {
    public temp_id: number;
    public editing: boolean = false;
    public valid: ValidationSaison;
    public datasource: saison;
    nomSubject = new Subject<string>();
    datedebutSubject = new Subject<Date>();
    datefinSubject = new Subject<Date>();
    activeSubject = new Subject<boolean>();
    Type_Adhesion: Type_Adhesion[] = [];

    constructor(L: saison) {
        this.datasource = L;
        this.editing = this.datasource.id === 0;
        try {
            this.Type_Adhesion = JSON.parse(this.datasource.type_adhesions);
        } catch (error) {
            this.Type_Adhesion = [];
        }
        this.valid = new ValidationSaison(this);
        this.valid.controler();
    }

    get id(): number {
        return this.datasource.id;
    }
    set id(value: number) {
        this.datasource.id = value;
    }

    get nom(): string {
        return this.datasource.nom;
    }
    set nom(value: string) {
        this.datasource.nom = value;
        this.nomSubject.next(value);
    }

    get date_debut(): Date {
        return this.datasource.date_debut;
    }
    set date_debut(value: Date) {
        this.datasource.date_debut = value;
        this.datedebutSubject.next(value);
    }

    get date_fin(): Date {
        return this.datasource.date_fin;
    }
    set date_fin(value: Date) {
        this.datasource.date_fin = value;
        this.datefinSubject.next(value);
    }

    get active(): boolean {
        return this.datasource.active;
    }
    set active(value: boolean) {
        this.datasource.active = value;
        this.activeSubject.next(value);
    }
}

@Injectable({
    providedIn: 'root',
})
export class ValidationSaison {
    public control: boolean = false;
    public nom: boolean = false;
    public date_debut: boolean = false;
    public date_fin: boolean = false;
    public ordre_date: boolean = false;

    constructor(private saison: Saison) {
        this.saison.nomSubject.subscribe((value) => this.validateNom(value));
        this.saison.datedebutSubject.subscribe((value) => this.validateDate(value, this.saison.date_fin));
        this.saison.datefinSubject.subscribe((value) => this.validateDate(this.saison.date_debut, value));
        this.controler();
    }

    controler() {
        this.validateNom(this.saison.nom);
        this.validateDate(this.saison.date_debut, this.saison.date_fin);
        this.checkcontrolvalue();
    }

    checkcontrolvalue() {
        this.control = this.nom && this.date_debut && this.date_fin && this.ordre_date;
    }

    private validateNom(value: string) {
        this.nom = value && value.length >= 3;
        this.checkcontrolvalue();
    }

    private validateDate(deb: Date, fin: Date) {
        this.date_debut = !!deb;
        this.date_fin = !!fin;
        this.ordre_date = this.date_debut && this.date_fin && deb < fin;
        this.checkcontrolvalue();
    }
}
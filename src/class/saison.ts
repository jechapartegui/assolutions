import { EventEmitter, Injectable, Output } from "@angular/core";
import { Subject } from "rxjs";

export class saison {
    public id: number = 0;
    public nom: string = "";
    public active: boolean = false;
    public date_debut: Date;
    public date_fin: Date;
}
@Injectable({
    providedIn: 'root', // ou spécifiez un module si nécessaire
})
export class Saison {
    public temp_id:number;
    public editing: boolean = false;
    public valid: ValidationSaison;
    public datasource: saison;
    // Utilisez des sujets pour chaque propriété
    nomSubject = new Subject<string>();
    datedebutSubject = new Subject<Date>();
    datefinSubject = new Subject<Date>();
    activeSubject = new Subject<boolean>();

    constructor(L: saison) {
        this.datasource = L;
        if (this.datasource.id == 0) {
            this.editing = true;
        } else {
            this.editing = false;
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
    // Propriété nom avec get et set
    get nom(): string {
        return this.datasource.nom;
    }
    set nom(value: string) {
        this.datasource.nom = value;
        this.nomSubject.next(value);
    }

    // Propriété  avec get et set
    get date_debut(): Date {
        return this.datasource.date_debut;
    }
    set date_debut(value: Date) {
        this.datasource.date_debut = value;
        this.datefinSubject.next(value);
    }
    // Propriété  avec get et set
    get date_fin(): Date {
        return this.datasource.date_fin;
    }
    set date_fin(value: Date) {
        this.datasource.date_fin = value;
        this.datefinSubject.next(value);
    }
    // Propriété  avec get et set
    get active(): boolean {
        return this.datasource.active;
    }
    set active(value: boolean) {
        this.datasource.active = value;
        this.activeSubject.next(value);
    }
}
@Injectable({
    providedIn: 'root', // ou spécifiez un module si nécessaire
})
export class ValidationSaison {
    public control: boolean;
    public nom: boolean;
    public date_debut: boolean;
    public date_fin: boolean;
    public ordre_date: boolean;

    constructor(private saison: Saison) {
        this.saison.nomSubject.subscribe((value) => this.validateNom(value));
        this.saison.datedebutSubject.subscribe((value) => this.validateDate(value, saison.date_fin));
        this.saison.datefinSubject.subscribe((value) => this.validateDate(saison.date_debut, value));
        this.controler();
    }

    controler() {
        this.control = true;
        // Appeler les méthodes de validation pour tous les champs lors de la première validation
        this.validateNom(this.saison.nom);
        this.validateDate(this.saison.date_debut, this.saison.date_fin);

    }
    checkcontrolvalue() {
        if (this.nom && this.date_debut && this.date_fin && this.ordre_date) {
            this.control = true;
        }

    }

    private validateNom(value: string) {
        // Code de validation du nom
        // Mettre à jour this.nom en conséquence
        if (value) {
            if (value.length < 3) {
                this.nom = false;
                this.control = false;
            } else {
                this.nom = true;
                this.checkcontrolvalue();
            }
        } else {
            this.nom = false;
            this.control = false;
        }
    }
    private validateDate(deb: Date, fin: Date) {
        // Code de validation du nom
        // Mettre à jour this.nom en conséquence
        if (deb) {
            this.date_debut = true;
            if (fin) {
                this.date_fin = true;
                if (deb < fin) {
                    this.ordre_date = true;
                    this.checkcontrolvalue();
                } else {
                    this.ordre_date = false;
                    this.control = false;
                }
            } else {
                this.date_fin = false;
                this.control = false;
            }
        } else {
            if (fin) {
                this.date_fin = true;
            } else {
                this.date_fin = false;
                this.control = false;
            }
            this.date_debut = false;
            this.control = false;
        }
    }



}
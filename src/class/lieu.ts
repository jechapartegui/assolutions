import { Subject } from "rxjs";
import { Adresse } from "./address";

export class lieu {
    public id: number = 0;
    public nom: string = "";
    public adresse: string = "";
}

export class Lieu {
    public editing: boolean = false;
    public valid: ValidationLieu;
    public datasource: lieu;
    public Adresse:Adresse;
    // Utilisez des sujets pour chaque propriété
    nomSubject = new Subject<string>();
    adresseSubject = new Subject<Adresse>();
    public temp_id: number;

    constructor(L: lieu) {
        this.datasource = L;
        if (this.id == 0) {
            this.editing = true;
        } else {
            this.editing = false;
        }   
        this.Adresse = JSON.parse(this.datasource.adresse);
        this.valid = new ValidationLieu(this);
        this.valid.controler();
        console.log(this);
    }



    // Propriété nom avec get et set
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

    // Propriété prenom avec get et set
   
}

export class ValidationLieu {
    public control: boolean;
    public nom: boolean;
    public adresse: boolean;

    constructor(private lieu: Lieu) {
        this.lieu.nomSubject.subscribe((value) => this.validateNom(value));

    }

    controler() {
        this.control = true;
        // Appeler les méthodes de validation pour tous les champs lors de la première validation
        this.validateNom(this.lieu.nom);
        

    }
    checkcontrolvalue() {
        if (this.nom && this.adresse) {
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

   


}
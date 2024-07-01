import { Subject } from "rxjs";
import { seance } from "./seance";
import { Groupe } from "./groupe";
import { InscriptionSeance } from "./inscription";

export class adherent{
    public id:number;
    public prenom:string;
    public nom:string;
    public surnom:string;
    public date_naissance:Date;
    public adresse:string;
    public contact:string= "[]";
    public contact_prevenir:string= "[]";
    public nationalite:string;
    public date_creation:Date;
    public photo:string;
    public sexe:boolean;
    public seance:seance[];
    public groupes: Groupe[] = [];
    public mot_de_passe: string = "";
    public contacts_prevenir: string = "[]";
    public compte: number = 0;
    public inscriptions: InscriptionSeance[] = [];
    public seances_prof: seance[] = [];
}

export class Adherent{
    datasource:adherent;
    
    sLibelle = new Subject<string>();
    constructor(L:adherent){
        this.datasource=L;
    }
    
    public get Nom() : string {
        return this.datasource.nom;
    }
    public set Nom(v : string) {
        this.datasource.nom = v;
        this.SetLibelle(v, this.datasource.prenom, this.datasource.surnom);
    }

    public get Prenom() : string {
        return this.datasource.prenom;
    }
    public set Prenom(v : string) {
        this.datasource.prenom = v;
        this.SetLibelle(this.datasource.nom, v, this.datasource.surnom);
    }

    public get Surnom() : string {
        return this.datasource.surnom;
    }
    public set Surnom(v : string) {
        this.datasource.surnom = v;
        this.SetLibelle(this.datasource.nom, this.datasource.prenom, v);
    }

    public Libelle:string;
    public SetLibelle(Nom : string, Prenom:string, Surnom:string) {
        if(Prenom && Prenom.length>0){
            this.Libelle = Prenom;
        }
        if(Nom && Nom.length>0){
            if(this.Libelle && this.Libelle.length>0){
                this.Libelle = this.Libelle + " " + Nom;
            } else {
                this.Libelle = Nom;
            }
        }
        if(Surnom && Surnom.length>0){
            if(this.Libelle && this.Libelle.length>0){
                this.Libelle = this.Libelle + " " + Surnom;
            } else {
                this.Libelle = Surnom;
            }
        }
        this.sLibelle.next(this.Libelle);
    }
    
    
}

export class Validation_Adherent{

}
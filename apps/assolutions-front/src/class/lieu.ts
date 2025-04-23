import { Adresse } from "./address";

export class lieu {
    public id: number = 0;
    public nom: string = "";
    public adresse: string = JSON.stringify(new Adresse());
}

export class Lieu {
    
    public get ID() : number {
        return this.datasource.id;
    }
    public set ID(v : number) {
        this.datasource.id = v;
    }
    public get Nom() : string {
        return this.datasource.nom;
    }
    public set Nom(v : string) {
        this.datasource.nom = v;
    }
    
    public datasource: lieu;
    public Adresse:Adresse;
  
    constructor(L: lieu) {
        this.datasource = L;
      
        this.Adresse = JSON.parse(this.datasource.adresse);
    }

    // Propriété prenom avec get et set
   
}


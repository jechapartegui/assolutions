import { Adherent } from "./adherent";

export class Groupe{
    public id:number;
    public nom:string = "";
    public saison_id:number;
    public temp_id:number;
}

export class Groupe_Lie extends Groupe{
    public adherents:Adherent[] =[];
}

export class Lien_Groupe {
    public groupes:number[];
    public objet_id:number;
    public objet_type:string;

}


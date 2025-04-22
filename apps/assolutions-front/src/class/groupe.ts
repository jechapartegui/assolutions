

export class Groupe{
    public id:number;
    public nom:string = "";
    public saison_id:number;
    public temp_id:number;
    public display:boolean = false;
    public lien_groupe_id:number = 0;
}

export class Lien_Groupe {
    public id:number;
    public groupes:number[];
    public objet_id:number;
    public objet_type:string;

}


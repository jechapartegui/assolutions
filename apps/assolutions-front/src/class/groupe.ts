

export class Groupe{
    public id:number;
    public nom:string = "";
    public display:boolean = false;
}

export class Lien_Groupe {
    public id:number;
    public groupes:number[];
    public objet_id:number;
    public objet_type:string;

}


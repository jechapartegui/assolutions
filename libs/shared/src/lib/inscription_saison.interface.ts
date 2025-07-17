import { LienGroupe_VM } from "./groupe.interface";

export class InscriptionSaison_VM{
    public id:number = 0;
    public groupes:LienGroupe_VM[];
    public saison_id:number;
    public rider_id:number;
    public active:boolean;
    
    
}
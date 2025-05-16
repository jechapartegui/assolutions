import { KeyValuePair } from "./autres.interface";

export interface adherent{
     id:number;
     nom:string;
     prenom:string;
     surnom:string;
     date_naissance:Date;
     sexe:boolean;
    adresse: string;
    code_postal: string;
    ville: string;
    compte:number;
    contact:ItemContact[];
    contact_prevenir:ItemContact[];
    login:string;
    inscrit:boolean;
    groupes:KeyValuePair[];

}
export interface ItemContact {

  Type: string;
  Value: string;
  Notes: string;
  Pref: boolean;
}


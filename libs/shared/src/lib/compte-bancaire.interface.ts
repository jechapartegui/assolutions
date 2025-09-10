import { PersonneLight_VM } from "./personne.interface";

export class CompteBancaire_VM {
id = 0;
project_id = 0;
nom!: string;
type!: string;
info?: string;
actif = true;
iban?: string;
carte?: Record<string, unknown> | null; // parsed cardJson
carte_titulaire_id?:number;
carte_titulaire?: PersonneLight_VM;
}
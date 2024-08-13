export class Professeur{
    public id:number;
    public prenom:string;
    public nom:string;
    public taux:number;
    public statut:string;
    public num_tva:string;
    public num_siren:string;
    public iban:string;
    public info:string;
    public saisons:prof_saison[];
  
    
}
export class prof_saison{
    saison_id:number;
    taux_horaire:number;
}
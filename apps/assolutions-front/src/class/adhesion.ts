export class Adhesion{
    public rider_id:number = 0;
    public saison_id:number = 0;
    public id:number=0;
    public paiements:paiement_adhesion[]=[];


}

export class Type_Adhesion{
    public id:number = 0;
    public libelle:string = "";
    public montant:number = 0;
    public saison_id:number = 0;
    public compte_id:number = 0;
    public mode_paiement:number = 0;
    public classe_comptable_id:number = 0;
    public date_paiement_fixe:boolean = true; // si vrai, les différents paiements interviennent à des dates fixes, sinon ils sont calculés en fonction de la date d'adhésion.
    public paiements:paiement_adhesion[]=[]; // dans type adhésion paiement est utilisé pour paramétrer les types de paiements : date prevue correspond aux dates théoriques de paiement,
    //   montant au montant du paiement, pas d'id FF ni date realisee
    
}

export interface paiement_adhesion {
    numero: number;
    date_prevue: Date; // format "AAAA-MM-JJ"
    date_realisée?: Date; // format "AAAA-MM-JJ", peut être undefined si non réalisée
    montant: number;
    id_flux_financier?: number; // id du flux financier correspondant, peut être undefined si non réalisé
  }
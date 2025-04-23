export class operation {
  public id: number =0;
  public solde: number = 0;
  public date_operation: string;
  public mode: number; //liste valeur
  public destinataire:string="";
  public paiement_execute: number;
  public compte_bancaire_id: number;
  public flux_financier_id: number;
  public info: string;
}

export class Operation {
  public datasource: operation;
  constructor(t: operation, libelleFF:string) {
    this.datasource = t;
    this.Libelle = libelleFF;
  }

  public temp_id:number;

  public Libelle:string;

  public get ID(): number {
    return this.datasource.id;
  }

  public set ID(v: number) {
    this.datasource.id = v;
  }

  public get CompteBancaireID(): number {
    return this.datasource.compte_bancaire_id;
  }

  public set CompteBancaireID(v: number) {
    this.datasource.compte_bancaire_id = v;
  }

  public get Solde(): number {
    if (this.IsRecette) {
      return this.datasource.solde;
    } else {
      return -this.datasource.solde;
    }
  }
  public set Solde(v: number) {
    if (this.IsRecette) {
      this.datasource.solde = v;
    } else {
      this.datasource.solde = -v;
    }
  }

  public get IsRecette(): boolean {
    if (this.datasource.solde > 0) {
      return true;
    } else {
      return false;
    }
  }
  public set IsRecette(v: boolean) {
    if (v) {
      this.datasource.solde = this.Solde;
    } else {
      this.datasource.solde = -this.Solde;
    }
  }

  get Date(): string {
    try {
      return this.datasource.date_operation.toString();
    } catch (error) {
      return '0000-00-00';
    }
  }
  set Date(value: string) {
    this.datasource.date_operation = value;
  }

  public get Info(): string {
    return this.datasource.info;
  }
  public set Info(v: string) {
    this.datasource.info = v;
  }

  public get ModePaiement(): number {
    return this.datasource.mode;
  }
  public set ModePaiement(v: number) {
    this.datasource.mode = v;
  }

  public get StatutPaiement(): number {
    return this.datasource.paiement_execute;
  }
  public set StatutPaiement(v: number) {
    this.datasource.paiement_execute = v;
  }  

  public get Destinataire(): any {
    return this.datasource.destinataire;
  }
  public set Destinataire(v: any) {
    this.datasource.destinataire = v;
  }
  public DestinataireLibelle:string;
  
  public get FluxFinancierID() : number {
    return this.datasource.flux_financier_id;
  }
  public set FluxFinancierID(v : number) {
    this.datasource.flux_financier_id = v;
  }
  

}

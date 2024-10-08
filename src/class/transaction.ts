import { fluxfinancier } from "./fluxfinancier";

export class transaction {
  public id: number;
  public solde: number;
  public date_transaction: string;
  public mode: string; //liste valeur
  public destinataire_objet: string;
  public destinataire_objet_id: number;
  public paiement_execute: number;
  public compte_bancaire_id: number;
  public flux_financier_id: number;
  public info: string;
}

export class Transaction {
  public datasource: transaction;
  constructor(t: transaction, libelleFF:string) {
    this.datasource = t;
    this.ID = 0;
    this.Solde = 0;
    this.Date = new Date().toString();
    this.Libelle = libelleFF;
  }

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
      return this.datasource.date_transaction.toString();
    } catch (error) {
      return '0000-00-00';
    }
  }
  set Date(value: string) {
    this.datasource.date_transaction = value;
  }

  public get Info(): string {
    return this.datasource.info;
  }
  public set Info(v: string) {
    this.datasource.info = v;
  }

  public get ModePaiement(): string {
    return this.datasource.mode;
  }
  public set ModePaiement(v: string) {
    this.datasource.mode = v;
  }

  public get StatutPaiement(): number {
    return this.datasource.paiement_execute;
  }
  public set StatutPaiement(v: number) {
    this.datasource.paiement_execute = v;
  }

  public get DestinataireID(): number {
    return this.datasource.destinataire_objet_id;
  }
  public set DestinataireID(v: number) {
    this.datasource.destinataire_objet_id = v;
  }

  public get TypeDestinataire(): string {
    return this.datasource.destinataire_objet;
  }
  public set TypeDestinataire(v: string) {
    this.datasource.destinataire_objet = v;
  }
  public get LibelleDestinataire(): string {
    if (this.datasource.destinataire_objet_id > 0) {
      return '';
    } else {
      return this.datasource.destinataire_objet;
    }
  }
  public set LibelleDestinataire(v: string) {
    if (v.length > 1) {
      this.datasource.destinataire_objet = v;
      this.datasource.destinataire_objet_id = 0;
    }
  }

  
  public get FluxFinancierID() : number {
    return this.datasource.flux_financier_id;
  }
  public set FluxFinancierID(v : number) {
    this.datasource.flux_financier_id = v;
  }
  

}

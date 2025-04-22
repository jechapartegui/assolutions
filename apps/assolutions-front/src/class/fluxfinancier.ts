import { Stock, stock } from './stock';
import { Operation, operation } from './operation';
import { Doc } from './doc';

export class fluxfinancier {
  public id: number = 0;
  public libelle: string = "";
  public date: string = new Date().toString();
  public statut: number = 0;
  public montant: number = 0;
  public info: string = "";
  public recette: boolean = false;
  public classe_comptable:number;
  public destinataire:string="";
  public stocks: stock[] = [];
  public operations: operation[] = [];
}

export class FluxFinancier {
  datasource: fluxfinancier;
  liste_operation: Operation[];
  liste_stock: Stock[];
  NbPaiement:number=1;
  constructor(ff: fluxfinancier) {
    this.datasource = ff;
    if(ff.operations){
      this.liste_operation = ff.operations.map(
        (x) => new Operation(x, ff.libelle)
      );
    } else {
      this.liste_operation = [];
    }
    if(ff.stocks){
      this.liste_stock =ff.stocks.map(
        (x) => new Stock(x)
      );
    } else {
      this.liste_stock = [];
    }
  }
  public get ID(): number {
    return this.datasource.id;
  }
  public set ID(v: number) {
    this.datasource.id = v;
  }
  public get ClasseComptable(): number {
    return this.datasource.classe_comptable;
  }
  public set ClasseComptable(v: number) {
    this.datasource.classe_comptable = v;
  }

  public get Libelle(): string {
    return this.datasource.libelle;
  }
  public set Libelle(v: string) {
    this.datasource.libelle = v;
  }
  public get Info(): string {
    return this.datasource.info;
  }
  public set Info(v: string) {
    this.datasource.info = v;
  }
  public get Montant(): number {
    if (this.IsRecette) {
      return this.datasource.montant;
    } else {
      return -this.datasource.montant;
    }
  }
  public set Montant(v: number) {
    if (this.IsRecette) {
      this.datasource.montant = v;
    } else {
      this.datasource.montant = -v;
    }
  }

  public get IsRecette(): boolean {
    return this.datasource.recette;
  }
  public set IsRecette(v: boolean) {
    this.datasource.recette = v;
  }

  get Date(): string {
    try {
      return this.datasource.date.toString();
    } catch (error) {
      return '0000-00-00';
    }
  }
  set Date(value: string) {
    this.datasource.date = value;
  }

  public get Statut(): number {
    return this.datasource.statut;
  }
  public set Statut(v: number) {
    this.datasource.statut = v;
  }

  public Documents:Doc[] = [];

  
  // Méthode pour télécharger le document


  public get Destinataire(): any {
    return this.datasource.destinataire;
  }
  public set Destinataire(v: any) {
    this.datasource.destinataire = v;
  }
  public DestinataireLibelle:string;
}

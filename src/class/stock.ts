import { ObjetAppli, TypeStock } from 'src/app/global';
import { Doc } from './doc';

export class stock {
  public id: number =0;
  public qte: number=0;
  public lieu_stockage: string;
  public type_stock: number = 0;
  public valeur_achat: number =0;
  public date_achat: string;
  public flux_financier_id: number;
  public libelle: string = "";
  public info: string = "";
}

export class Stock {
  public datasource: stock;
  public to_sell:boolean=false;
  constructor(s: stock) {
    this.datasource = s;
    if (!this.datasource.type_stock) {
      this.TypeStock = 0;
    }  
    
  }

  public get ID(): number {
    return this.datasource.id;
  }
  public set ID(v: number) {
    this.datasource.id = v;
  }

public get TypeStock() : number {
  return this.datasource.type_stock;
}
public set TypeStock(v : number) {
  this.datasource.type_stock = v;
}


  public TypeStockLibelle:string;

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
  public get Quantite(): number {
    return this.datasource.qte;
  }
  public set Quantite(v: number) {
    this.datasource.qte = v;
  }
  public get Valeur_Achat(): number {
    return this.datasource.valeur_achat;
  }
  public set Valeur_Achat(v: number) {
    this.datasource.valeur_achat = v;
  }

  get Date(): string {
    try {
      return this.datasource.date_achat.toString();
    } catch (error) {
      return '0000-00-00';
    }
  }
  set Date(value: string) {
    this.datasource.date_achat = value;
  }

  public get FluxFinancierID(): number {
    return this.datasource.flux_financier_id;
  }
  public set FluxFinancierID(v: number) {
    this.datasource.flux_financier_id = v;
  }

  public Documents: Doc[] = [];

  // Méthode pour télécharger le document

  public get LieuStockage(): ObjetAppli {
    try {
      const parsed = JSON.parse(this.datasource.lieu_stockage);
      return parsed;
    } catch (error) {
      return {
        id: 0,
        type: 'autre',
        value: $localize`:@@non_defini:Non défini`,
      };
    }
  }
  public set LieuStockage(v: {
    id: number;
    type:  string;
    value: string;
  }) {
    this.datasource.lieu_stockage = JSON.stringify(v);
  }
  public LieuStockageLibelle: string;
}

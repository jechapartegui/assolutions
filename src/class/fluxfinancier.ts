import { stock } from './stock';
import { Transaction, transaction } from './transaction';

export class fluxfinancier {
  public id: number = 0;
  public libelle: string = "";
  public date: string = new Date().toString();
  public statut: number = 0;
  public montant: number = 0;
  public info: string = "";
  public document: any;
  public recette: boolean = false;
  public stocks: stock[] = [];
  public transactions: transaction[] = [];
}

export class FluxFinancier {
  datasource: fluxfinancier;
  liste_transaction: Transaction[];
  liste_stock: stock[];
  constructor(ff: fluxfinancier) {
    this.datasource = ff;
    this.liste_transaction = ff.transactions.map(
      (x) => new Transaction(x, ff.libelle)
    );
    this.liste_stock = ff.stocks;
  }
  public get ID(): number {
    return this.datasource.id;
  }
  public set ID(v: number) {
    this.datasource.id = v;
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
    if (this.datasource.recette) {
      return true;
    } else {
      return false;
    }
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

  // Gestion du document
  public get Document(): Blob {
    return this.datasource.document;
  }

  public set Document(newDocument: Blob) {
    this.datasource.document = newDocument;
  }

  // Méthode pour télécharger le document
  public downloadDocument() {
    if (this.datasource.document) {
      const blob = new Blob([this.datasource.document], {
        type: 'application/octet-stream',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document';
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      console.error('Aucun document disponible à télécharger');
    }
  }

  // Méthode pour ajouter un nouveau document (en remplacement)
  public uploadDocument(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const result = e.target.result;
      this.datasource.document = new Blob([result], { type: file.type });
    };
    reader.readAsArrayBuffer(file);
  }
}

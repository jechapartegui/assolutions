import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { stock, Stock } from 'src/class/stock';
import { AddInfoService } from 'src/services/addinfo.service';
import { ErrorService } from 'src/services/error.service';
import { GlobalService } from 'src/services/global.services';
import { StaticClass } from '../global';
import { StockService } from 'src/services/stock.service';
import { ExcelService } from 'src/services/excel.service';
import { MultifiltersStockPipe } from 'src/filters/multifilters-stock.pipe';

@Component({
  selector: 'app-stock',
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.css'],
})
export class StockComponent implements OnInit {
  liste_lieu: {
    id: number;
    type: 'stock' | 'rider' | 'lieu' | 'prof' | 'compte' | 'transaction' | 'autre';
    value: string;
  }[] = [];
  liste_transaction: {
    id: number;
    type: 'stock' | 'rider' | 'lieu' | 'prof' | 'compte' | 'transaction' | 'autre';
    value: string;
  }[] = [];
  est_prof: boolean = false;
  est_admin: boolean = false;
  liste_stock: Stock[] = [];
  liste_type_equipement: string[] = [];
  liste_equipement: string[];
  IsVendre: boolean = false;  editMode = false;
  editStock: Stock | null = null;
  public TypeStock: { categorie: string; libelle: string }[] = [];
  public TypeTransaction: { class_compta: number; libelle: string }[] = [];

  libelle_Export = $localize`Exporter vers Excel`;
  public sort_libelle = 'NO';
  public sort_type = 'NO';
  public sort_date = 'NO';
  public sort_lieu = 'NO';
  public afficher_filtre: boolean = false;
  filters = {
    filter_libelle: '',
    filter_date_avant: null,
    filter_date_apres: null,
    filter_lieu: null,
    filter_type_equipement: null,
    filter_equipement: null,
  };
  public action: string = '';

  constructor(
    public GlobalService: GlobalService,
    private router: Router,
    private stockservice: StockService,
    public SC: StaticClass,
    public excelService: ExcelService,
    private addinfo_serv: AddInfoService,
    private multifiltersStockPipe: MultifiltersStockPipe
  ) {}

  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les stocks`;
    if (GlobalService.is_logged_in) {
      if (GlobalService.menu === 'ADHERENT') {
        this.router.navigate(['/menu']);
        return;
      }
      // Chargez la liste des cours
   
          this.action = $localize`Charger la liste des endroits de stockage`;
          if (!this.SC.ListeObjet || this.SC.ListeObjet.length == 0) {
            this.addinfo_serv.GetObjet().then((liste) => {
              this.SC.ListeObjet = liste;
              this.liste_lieu = this.SC.ListeObjet.filter(
                (x) =>
                  x.type == 'rider' || x.type == 'lieu' || x.type == 'autre'
              );
              this.liste_transaction = this.SC.ListeObjet.filter(
                (x) =>
                  x.type == 'transaction'
              );
            });
          } else {
            this.liste_lieu = this.SC.ListeObjet.filter(
              (x) => x.type == 'rider' || x.type == 'lieu' || x.type == 'autre'
            );
            this.liste_transaction = this.SC.ListeObjet.filter(
              (x) =>
                x.type == 'transaction'
            );
          }
          this.action = $localize`Charger les types de stcok`;
          if (!this.SC.TypeStock || this.SC.TypeStock.length == 0) {
            this.addinfo_serv.GetLV('stock').then((liste) => {
              this.SC.TypeStock = JSON.parse(liste);
              this.TypeStock = this.SC.TypeStock;
            });
          } else {
            this.TypeStock = this.SC.TypeStock;
          }
          this.action = $localize`Charger les types d'achat`;
          if (!this.SC.TypeTransaction || this.SC.TypeTransaction.length == 0) {
            this.addinfo_serv.GetLV('type_achat').then((liste) => {
              this.SC.TypeTransaction = JSON.parse(liste);
              this.TypeTransaction = this.SC.TypeTransaction;
            });
          } else {
            this.TypeTransaction = this.SC.TypeTransaction;
          }
          this.UpdateListeStock();
    } else {
      let o = errorService.CreateError(
        this.action,
        $localize`Accès impossible, vous n'êtes pas connecté`
      );
      errorService.emitChange(o);
      this.router.navigate(['/login']);
    }
  }
  GetTransaction(cours) {
    return this.liste_transaction.find((x) => x.id == cours).value;
  }


  Edit(stock: Stock): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger l'équipement`;
    this.stockservice
      .Get(stock.ID)
      .then((ss) => {
        this.editStock = new Stock(ss);
        this.editMode = true;
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }

  Acheter(){

  }
  VendreList(){

  }

  Vendre(stock:Stock){

  }


  Creer(): void {
    this.editStock = new Stock(new stock());
    this.editStock.Date = new Date().toString();
    this.editMode = true;
  }

  Voir(stock: Stock = null) {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger l'équipement`;
    this.stockservice
      .Get(stock.ID)
      .then((ss) => {
        this.editStock = new Stock(ss);
        this.editMode = false;
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }

  
  UpdateListeStock() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les équipements`;
    this.stockservice
    .GetAll()
    .then((stocks) => {
      if (stocks.length == 0) {
        this.liste_stock = [];
        let o = errorService.CreateError(
          this.action,
          $localize`Aucun stock`
        );
        errorService.emitChange(o);
        return;
      } else {
        this.liste_stock = stocks.map((x) => new Stock(x));
        this.liste_stock.forEach((st) =>{
          st.LieuStockageLibelle = st.LieuStockage.value + '(' + st.LieuStockage.value + ')';
        })
        this.liste_stock.forEach((st) =>{
          st.TypeStockLibelle = st.TypeStock.libelle + '(' + st.TypeStock.categorie + ')';
        })
        this.liste_stock.sort((a, b) => {
          let dateA = a.datasource.date_achat;
          let dateB = b.datasource.date_achat;

          let comparaison = 0;
          if (dateA > dateB) {
            comparaison = -1;
          } else if (dateA < dateB) {
            comparaison = 1;
          }

          return -comparaison; // Inverse pour le tri descendant
        });
      }
    })
    .catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action,
        err.message
      );
      errorService.emitChange(o);
      return;
    });
   
  }

  ReinitFiltre() {
    this.filters = {
      filter_libelle: '',
      filter_date_avant: null,
      filter_date_apres: null,
      filter_lieu: null,
      filter_type_equipement: null,
      filter_equipement: null,
    };
  }


  Delete(stock: Stock): void {
    const errorService = ErrorService.instance;

    let confirmation = window.confirm(
      $localize`Voulez-vous supprimer cet équipement ? Cette action est définitive. `
    );
    if (confirmation) {
      this.action = $localize`Supprimer un équipement`;
      if (stock) {
        this.stockservice
          .Delete(stock.ID)
          .then((result) => {
            if (result) {
             
              this.UpdateListeStock();
              let o = errorService.OKMessage(this.action);
              errorService.emitChange(o);
            } else {
              let o = errorService.UnknownError(this.action);
              errorService.emitChange(o);
            }
          })
          .catch((err: HttpErrorResponse) => {
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
          });
      }
    }
  }

  Save() {
    const errorService = ErrorService.instance;
    this.action = $localize`Ajouter un équipement`;
    this.editStock.datasource.type_stock = JSON.stringify(this.editStock.TypeStock);
    this.editStock.datasource.lieu_stockage = JSON.stringify(this.editStock.LieuStockage);
    if (this.editStock) {
      if (this.editStock.ID == 0) {
          this.stockservice
            .Add(this.editStock.datasource)
            .then((id) => {
              if (id > 0) {
                this.editStock.ID = id;
                let o = errorService.OKMessage(this.action);
                errorService.emitChange(o);
                this.UpdateListeStock();
              } else {
                let o = errorService.UnknownError(this.action);
                errorService.emitChange(o);
              }
            })
            .catch((err) => {
              let o = errorService.CreateError(this.action, err.message);
              errorService.emitChange(o);
            });
      } else {
        this.action = $localize`Mettre à jour un équipement`;
        this.stockservice
          .Update(this.editStock.datasource)
          .then((ok) => {
            if (ok) {
              let o = errorService.OKMessage(this.action);
              errorService.emitChange(o);
              this.UpdateListeStock();
            } else {
              let o = errorService.UnknownError(this.action);
              errorService.emitChange(o);
            }
          })
          .catch((err) => {
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
          });
      }
    }
  }


  Refresh() {
    const errorService = ErrorService.instance;
    this.action = $localize`Rafraichir l'équipement`;
    this.stockservice
      .Get(this.editStock.ID)
      .then((c) => {
        this.editStock = new Stock(c);
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      });
  }

  Retour(): void {
    let confirm = window.confirm(
      $localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`
    );
    if (confirm) {
      this.editMode = false;
      this.editStock = null;
      this.UpdateListeStock();
    }
  }

  Sort(sens: 'NO' | 'ASC' | 'DESC', champ: string) {
    switch (champ) {
      case 'libelle':
        this.sort_libelle = sens;
        this.sort_date = 'NO';
        this.sort_lieu = 'NO';
        this.sort_type = 'NO';
        this.liste_stock.sort((a, b) => {
          const nomA = a.Libelle.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.Libelle.toUpperCase();
          let comparaison = 0;
          if (nomA > nomB) {
            comparaison = 1;
          } else if (nomA < nomB) {
            comparaison = -1;
          }

          return this.sort_libelle === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case 'lieu':
        this.sort_lieu = sens;
        this.sort_date = 'NO';
        this.sort_libelle = 'NO';
        this.sort_type = 'NO';
        this.liste_stock.sort((a, b) => {
          const lieuA = a.LieuStockageLibelle;
          const lieuB = b.LieuStockageLibelle;

          // Ignorer la casse lors du tri
          const lieuAUpper = lieuA.toUpperCase();
          const lieuBUpper = lieuB.toUpperCase();

          let comparaison = 0;
          if (lieuAUpper > lieuBUpper) {
            comparaison = 1;
          } else if (lieuAUpper < lieuBUpper) {
            comparaison = -1;
          }

          return this.sort_lieu === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case 'date':
        this.sort_lieu ='NO';
        this.sort_date = sens;
        this.sort_libelle = 'NO';
        this.sort_type = 'NO';
        this.liste_stock.sort((a, b) => {
          let dateA = a.datasource.date_achat;
          let dateB = b.datasource.date_achat;

          let comparaison = 0;
          if (dateA > dateB) {
            comparaison = 1;
          } else if (dateA < dateB) {
            comparaison = -1;
          }

          return this.sort_date === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case 'type':
        this.sort_lieu ='NO';
        this.sort_date ='NO';
        this.sort_libelle = 'NO';
        this.sort_type = sens;
        this.liste_stock.sort((a, b) => {
          const coursA = a.TypeStockLibelle;
          const coursB = b.TypeStockLibelle;
          let comparaison = 0;
          if (coursA > coursB) {
            comparaison = 1;
          } else if (coursA < coursB) {
            comparaison = -1;
          }

          return this.sort_type === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
    }
  }

  Filtrer() {
    this.UpdateListeStock();
  }
  FiltrerBack() {
    this.UpdateListeStock();
  }

  ExporterExcel() {
    let headers = {
      ID: 'ID',
      Libelle: 'Libellé',
      TypeStockLibelle: 'Type équipement',
      LieuStockageLibelle: 'Lieu de stockage',
      Valeur_Achat: 'Valeur achat',
      Quantite: 'Quantite'
    };
    let list: Stock[] = this.getFilteredStocks();

    this.excelService.exportAsExcelFile(list,
      'liste_stock',
      headers
    );
  }
  getFilteredStocks(): Stock[] {
    return this.multifiltersStockPipe.transform(this.liste_stock, this.filters);
  }

}

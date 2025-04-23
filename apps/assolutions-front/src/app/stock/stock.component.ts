import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Stock, stock } from '../../class/stock';
import { MultifiltersStockPipe } from '../../filters/multifilters-stock.pipe';
import { AddInfoService } from '../../services/addinfo.service';
import { ErrorService } from '../../services/error.service';
import { ExcelService } from '../../services/excel.service';
import { GlobalService } from '../../services/global.services';
import { StockService } from '../../services/stock.service';
import { ObjetAppli, TypeStock, TypeTransaction, StaticClass } from '../global';

@Component({
  selector: 'app-stock',
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.css'],
})
export class StockComponent implements OnInit {

  
    @ViewChild('scrollableContent', { static: false })
    scrollableContent!: ElementRef;
    showScrollToTop: boolean = false;
    public loading: boolean = false;
    public histo_stock: string;
    public selected_filter: string;

  liste_lieu: ObjetAppli[] = [];
  liste_transaction: ObjetAppli[] = [];
  est_prof: boolean = false;
  est_admin: boolean = false;
  liste_stock: Stock[] = [];
  liste_type_equipement: string[] = [];
  liste_equipement: string[];
  IsVendre: boolean = false;
  editMode = false;
  editStock: Stock | null = null;
  public TypeStock: TypeStock[] = [];
  public TypeTransaction: TypeTransaction[] = [];
  public null_item: TypeStock = new TypeStock();
  libelle_Export = $localize`Exporter vers Excel`;
  public sort_libelle = 'NO';
  public sort_type = 'NO';
  public sort_date = 'NO';
  public sort_lieu = 'NO';
  public afficher_filtre: boolean = false;
  public filters: FilterStock = new FilterStock();
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
    this.loading = true;
    if (GlobalService.is_logged_in) {
      if (GlobalService.menu === 'ADHERENT') {
        this.loading = false;
        this.router.navigate(['/menu']);
        return;
      }
      // Chargez la liste des cours

      this.action = $localize`Charger la liste des endroits de stockage`;
      if (!this.SC.ListeObjet || this.SC.ListeObjet.length == 0) {
        this.addinfo_serv.GetObjet().then((liste) => {
          this.SC.ListeObjet = liste;
          this.liste_lieu = this.SC.ListeObjet.filter(
            (x) => x.type == 'rider' || x.type == 'lieu' || x.type == 'autre'
          );
          this.liste_transaction = this.SC.ListeObjet.filter(
            (x) => x.type == 'transaction'
          );
        });
      } else {
        this.liste_lieu = this.SC.ListeObjet.filter(
          (x) => x.type == 'rider' || x.type == 'lieu' || x.type == 'autre'
        );
        this.liste_transaction = this.SC.ListeObjet.filter(
          (x) => x.type == 'transaction'
        );
      }
      this.action = $localize`Charger les types de stcok`;
      if (!this.SC.TypeStock || this.SC.TypeStock.length == 0) {
        this.addinfo_serv.GetLV('stock').then((liste) => {
          this.SC.TypeStock = JSON.parse(liste);
          this.TypeStock = this.SC.TypeStock;
          this.liste_type_equipement = Array.from(
            new Set(this.TypeStock.map((typeStock) => typeStock.categorie))
          ).filter((categorie) => categorie !== null);
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
      this.loading = false;
      this.router.navigate(['/login']);
    }
  }
  GetTransaction(cours: number) {
    if (cours && cours > 0) {
      return this.liste_transaction.find((x) => x.id == cours).value  || $localize`Aucune`;
    } else {
      return $localize`Aucune`;
    }
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

  Acheter() {}
  VendreList() {}

  Vendre(stock: Stock) {}

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
        const LS = this.editStock.LieuStockage;
        if (
          LS.type == 'autre' &&
          LS.value == $localize`:@@non_defini:Non défini`
        ) {
          this.editStock.LieuStockageLibelle = $localize`:@@non_defini:Non défini`;
        } else {
          this.editStock.LieuStockageLibelle = LS.value + '(' + LS.type + ')';
        }
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
          let o = errorService.CreateError(this.action, $localize`Aucun stock`);
          errorService.emitChange(o);
          return;
        } else {
          this.liste_stock = stocks.map((x) => new Stock(x));
          this.liste_stock.forEach((st) => {
            const LS = st.LieuStockage;
            if (
              LS.type == 'autre' &&
              LS.value == $localize`:@@non_defini:Non défini`
            ) {
              st.LieuStockageLibelle = $localize`:@@non_defini:Non défini`;
            } else {
              st.LieuStockageLibelle = LS.value + '(' + LS.type + ')';
            }
            if (!st.TypeStock || st.TypeStock == 0) {
              st.TypeStockLibelle = $localize`Autre`;
            } else {
              const TS = this.SC.TypeStock.find((x) => x.id == st.TypeStock);
              if (TS) {
                st.TypeStockLibelle = TS.libelle + ' (' + TS.categorie + ')';
              } else {
                st.TypeStockLibelle = $localize`Autre`;
              }
            }
          });

          this.loading = false;
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
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.loading = false;
        return;
      });
  }
  onInputChange(displayText: string) {
    // Trouver l'objet complet correspondant à la valeur d'affichage
    const selectedOption = this.liste_lieu.find(
      (option) => this.formatLieu(option) === displayText
    );
    if (selectedOption) {
      // Mettre à jour l'affichage et le modèle avec l'objet sélectionné
      this.editStock.LieuStockageLibelle = displayText;
      this.editStock.LieuStockage = selectedOption;
      this.editStock.datasource.lieu_stockage =
        JSON.stringify(selectedOption);
    } else {
      // Gérer les saisies libres si nécessaire
      this.editStock.LieuStockage = {
        id: 0,
        type: '',
        value: displayText,
      };
      this.editStock.datasource.lieu_stockage = JSON.stringify(
        this.editStock.LieuStockage
      );
    }
  }

  formatLieu(destinataire: ObjetAppli) {
    return `${destinataire.value} (${destinataire.type})`;
  }


  ReinitFiltre() {
    this.filters = new FilterStock();
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
    this.editStock.datasource.lieu_stockage = JSON.stringify(
      this.editStock.LieuStockage
    );
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
        this.sort_lieu = 'NO';
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
        this.sort_lieu = 'NO';
        this.sort_date = 'NO';
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

  ExporterExcel() {
    let headers = {
      ID: 'ID',
      Libelle: 'Libellé',
      TypeStockLibelle: 'Type équipement',
      LieuStockageLibelle: 'Lieu de stockage',
      Valeur_Achat: 'Valeur achat',
      Quantite: 'Quantite',
    };
    let list: Stock[] = this.getFilteredStocks();

    this.excelService.exportAsExcelFile(list, 'liste_stock', headers);
  }
  getFilteredStocks(): Stock[] {
    return this.multifiltersStockPipe.transform(this.liste_stock, this.filters);
  }
  private waitForScrollableContainer(): void {
    setTimeout(() => {
      if (this.scrollableContent) {
        this.scrollableContent.nativeElement.addEventListener(
          'scroll',
          this.onContentScroll.bind(this)
        );
      } else {
        this.waitForScrollableContainer(); // Re-tente de le trouver
      }
    }, 100); // Réessaie toutes les 100 ms
  }

  onContentScroll(): void {
    const scrollTop = this.scrollableContent.nativeElement.scrollTop || 0;
    this.showScrollToTop = scrollTop > 200;
  }

  scrollToTop(): void {
    this.scrollableContent.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth', // Défilement fluide
    });
  }
}

export class FilterStock {
  private _filter_libelle: string | null = null;
  get filter_libelle(): string | null {
    return this._filter_libelle;
  }
  set filter_libelle(value: string | null) {
    this._filter_libelle = value;
    this.onFilterChange();
  }

  private _filter_date_avant: Date | null = null;
  get filter_date_avant(): Date | null {
    return this._filter_date_avant;
  }
  set filter_date_avant(value: Date | null) {
    this._filter_date_avant = value;
    this.onFilterChange();
  }

  private _filter_date_apres: Date | null = new Date();
  get filter_date_apres(): Date | null {
    return this._filter_date_apres;
  }
  set filter_date_apres(value: Date | null) {
    this._filter_date_apres = value;
    this.onFilterChange();
  }

  private _filter_type_equipement: string | null = null;
  get filter_type_equipement(): string | null {
    return this._filter_type_equipement;
  }
  set filter_type_equipement(value: string | null) {
    this._filter_type_equipement = value;
    this.onFilterChange();
  }

  private _filter_equipement: number | null = null;
  get filter_equipement(): number | null {
    return this._filter_equipement;
  }
  set filter_equipement(value: number | null) {
    this._filter_equipement = value;
    this.onFilterChange();
  }
  private _filter_lieu: ObjetAppli | null = null;
  get filter_lieu(): ObjetAppli | null {
    return this._filter_lieu;
  }
  set filter_lieu(value: ObjetAppli | null) {
    this._filter_lieu = value;
    this.onFilterChange();
  }

  private onFilterChange(): void {}
}

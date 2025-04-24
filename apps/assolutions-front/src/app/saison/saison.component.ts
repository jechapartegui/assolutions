import { Component, ElementRef, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Saison, saison } from '../../class/saison';
import { ErrorService } from '../../services/error.service';
import { ExcelService } from '../../services/excel.service';
import { GlobalService } from '../../services/global.services';
import { SaisonService } from '../../services/saison.service';

@Component({
  selector: 'app-saison',
  templateUrl: './saison.component.html',
  styleUrls: ['./saison.component.css']
})
export class SaisonComponent {
   public afficher_filtre: boolean = false;
    public loading: boolean = false;
    @ViewChild('scrollableContent', { static: false })
    scrollableContent!: ElementRef;
    showScrollToTop: boolean = false;
    public histo_saison: string;
    public filters: FilterSaison = new FilterSaison();
    public selected_filter: string;
    public selected_sort: any;
    public selected_sort_sens: any;
    public afficher_tri: boolean = false;
    est_prof: boolean = false;
    est_admin: boolean = false;
    manage_prof: boolean = false;
    liste_saison: Saison[] = []; // Initialisez la liste des séances (vous pouvez la charger à partir d'une API, par exemple)
    editMode = false;
    editSaison: Saison | null = null;
  
  
    public sort_nom = 'NO';
    public sort_date_debut = 'NO';
    public sort_date_fin = 'NO';

    public active_saison: Saison;
    public action: string = '';
  
    constructor(
      public GlobalService: GlobalService,
      private excelService: ExcelService,
      private router: Router,
      private saisonserv: SaisonService
    ) {}
  
    ngOnInit(): void {
      const errorService = ErrorService.instance;
      this.loading = true;
      this.action = $localize`Charger les séances`;
      if (GlobalService.is_logged_in) {
        if (GlobalService.menu === 'APPLI') {
          this.router.navigate(['/menu']);
          this.loading = false;
          return;
        }
        // Chargez la liste des séances
        this.UpdateListeSaison();
     
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

  
    Edit(saison: Saison): void {
      const errorService = ErrorService.instance;
      this.action = $localize`Charger la saison`;
      this.saisonserv
        .Get(saison.id)
        .then((ss) => {
          this.editSaison = new Saison(ss);
          this.histo_saison = JSON.stringify(this.editSaison.datasource);
          
          this.editMode = true;
        })
        .catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
    }
   
  
    Creer(): void {    
    this.editSaison = new Saison(new saison());
    this.histo_saison = JSON.stringify(this.editSaison.datasource);
      this.editMode = true;
    }
    Copier(saison:Saison): void {    
      this.histo_saison = JSON.stringify(saison);
      let ss = JSON.parse(this.histo_saison);
        this.editSaison = new Saison(ss);
        this.editSaison.id = 0;
        this.editSaison.active = false;
        this.editSaison.date_debut.setFullYear(this.editSaison.date_debut.getFullYear() + 1);
        this.editSaison.date_fin.setFullYear(this.editSaison.date_debut.getFullYear() + 1);
        this.editSaison.nom = this.editSaison.nom + ' (copie)';
        this.histo_saison = JSON.stringify(this.editSaison.datasource);
        this.editMode = true;
      }
    
  
  
  
    UpdateListeSaison() {
      const errorService = ErrorService.instance;
      this.saisonserv.GetAll().then((saison) => {
        if (saison.length == 0) {
          let o = errorService.CreateError(this.action,
            $localize`Il faut une saison au minimum`
          );
          errorService.emitChange(o);
          this.loading = false;
          return;
        } else {
          this.liste_saison = saison.map(x => new Saison(x));
          this.liste_saison.sort((a, b) => {
            let dateA = a.date_debut;
            let dateB = b.date_debut;

            let comparaison = 0;
            if (dateA > dateB) {
              comparaison = -1;
            } else if (dateA < dateB) {
              comparaison = 1;
            }

            return comparaison; // Inverse pour le tri descendant
          });
          this.loading = false;
        }
        
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(
          this.action,
          err.message
        );
        errorService.emitChange(o);
        this.loading = false;
        this.router.navigate(['/menu']);
        return;
      });

     
    }
  
  
    Delete(saison: Saison): void {
      const errorService = ErrorService.instance;
  
      let confirmation = window.confirm(
        $localize`Voulez-vous supprimer cette saison ? Cette action est définitive et peu recommandée vu les liens faits avec d'autres objets. `
      );
      if (confirmation) {
        this.action = $localize`Supprimer une saison`;
        if (saison) {
          this.saisonserv
            .Delete(saison.id)
            .then((result) => {
              if (result) {               
                this.UpdateListeSaison();
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
      this.action = $localize`Ajouter une saison`;
      if (this.editSaison) {
        if (this.editSaison.id == 0) {
            this.saisonserv
              .Add(this.editSaison.datasource)
              .then((id) => {
                if (id > 0) {
                  this.editSaison.id = id;
                
                  let o = errorService.OKMessage(this.action);
                  this.histo_saison = JSON.stringify(this.editSaison.datasource);
                  errorService.emitChange(o);
                  this.UpdateListeSaison();
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
          this.action = $localize`Mettre à jour une saison`;
          this.saisonserv
            .Update(this.editSaison.datasource)
            .then((ok) => {
              if (ok) {
                let o = errorService.OKMessage(this.action);
                this.histo_saison = JSON.stringify(this.editSaison.datasource);
                errorService.emitChange(o);
                this.UpdateListeSaison();
              } else {
                let o = errorService.UnknownError(this.action);
                errorService.emitChange(o);
              }
            })
            .catch((err) => {
              this.action = $localize`Mettre à jour une saison`;
              let o = errorService.CreateError(this.action, err.message);
              errorService.emitChange(o);
            });
        }
      }
    }

    Active(saison: Saison): void {
      const errorService = ErrorService.instance;
      this.action = $localize`Activer une saison`;
      this.liste_saison.forEach((s) => {
        if(s.active){
          s.active = false;
          this.saisonserv.Update(s.datasource).then((result) => {
            if (!result) {
             let o = errorService.UnknownError(this.action);
              errorService.emitChange(o);
            }
          })
          .catch((err: HttpErrorResponse) => {
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
          });
        }
    });
    saison.active = true;
    this.saisonserv.Update(saison.datasource).then((result) => {

      if (result) {
        this.UpdateListeSaison();
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
  
  
    Refresh() {
      const errorService = ErrorService.instance;
      this.action = $localize`Rafraichir la saison`;
      const ret_adh = JSON.stringify(this.editSaison.datasource);
    if (this.histo_saison != ret_adh) {
      let confirm = window.confirm(
        $localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`
      );
      if (!confirm) {
        return;
      }
    }
      this.saisonserv
        .Get(this.editSaison.id)
        .then((c) => {
          this.editSaison = new Saison(c);
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
      const ret_adh = JSON.stringify(this.editSaison.datasource);
      if (this.histo_saison != ret_adh) {
        let confirm = window.confirm(
          $localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`
        );
        if (!confirm) {
          return;
        }
      }
        this.editMode = false;
        this.editSaison = null;
        this.UpdateListeSaison();
    }
  
    Sort(sens: 'NO' | 'ASC' | 'DESC', champ: string) {
      switch (champ) {
        case 'nom':
          this.sort_nom = sens;
          this.sort_date_debut = 'NO';
          this.sort_date_fin = 'NO';
          this.liste_saison.sort((a, b) => {
            const nomA = a.nom.toUpperCase(); // Ignore la casse lors du tri
            const nomB = b.nom.toUpperCase();
            let comparaison = 0;
            if (nomA > nomB) {
              comparaison = 1;
            } else if (nomA < nomB) {
              comparaison = -1;
            }
  
            return this.sort_nom === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
          });
          break;
        
        case 'date_debut':
          this.sort_nom = 'NO';
          this.sort_date_debut = sens;
          this.sort_date_fin = 'NO';
          this.liste_saison.sort((a, b) => {
            let dateA = a.date_debut;
            let dateB = b.date_debut;
  
            let comparaison = 0;
            if (dateA > dateB) {
              comparaison = 1;
            } else if (dateA < dateB) {
              comparaison = -1;
            }
  
            return this.sort_date_debut === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
          });
          break;
          case 'date_fin':
            this.sort_nom = 'NO';
            this.sort_date_fin = sens;
            this.sort_date_debut = 'NO';
            this.liste_saison.sort((a, b) => {
              let dateA = a.date_fin;
              let dateB = b.date_fin;
    
              let comparaison = 0;
              if (dateA > dateB) {
                comparaison = 1;
              } else if (dateA < dateB) {
                comparaison = -1;
              }
    
              return this.sort_date_fin === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
            });
            break;
      }
    }
  
    ExportExcel() {
      let headers = {
        id: 'ID',
        nom: 'Nom',
        date_debut: 'Date de début',
        date_fin: 'Date de fin',
        active: 'Saison active ?',
      };
      let list: Saison[] = this.getFilteredSaisons();
      this.excelService.exportAsExcelFile(list, 'liste_saison', headers);
    }
    getFilteredSaisons(): Saison[] {
      return this.liste_saison.filter((saison) => {
        return (
          (!this.filters.filter_nom ||
            saison.nom
              .toLowerCase()
              .includes(this.filters.filter_nom.toLowerCase())) &&

          (!this.filters.filter_date_debut_avant ||
            new Date(saison.date_debut) <=
              new Date(this.filters.filter_date_debut_avant)) &&
          (!this.filters.filter_date_debut_apres ||
            new Date(saison.date_debut) >=
              new Date(this.filters.filter_date_debut_apres)) &&

              (!this.filters.filter_date_fin_avant ||
                new Date(saison.date_fin) <=
                  new Date(this.filters.filter_date_fin_avant)) &&
              (!this.filters.filter_date_fin_apres ||
                new Date(saison.date_fin) >=
                  new Date(this.filters.filter_date_fin_apres)) &&

          (!this.filters.filter_active||
            saison.active === this.filters.filter_active)
          
        );
      });
    }
  
    ReinitFiltre() {
      this.filters.filter_date_debut_apres = null;
      this.filters.filter_date_debut_avant = null;
      this.filters.filter_date_fin_apres = null;
      this.filters.filter_date_fin_avant = null;
      this.filters.filter_nom = null;
      this.filters.filter_active = null;
    }
  
    ngAfterViewInit(): void {
      this.waitForScrollableContainer();
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
  
  export class FilterSaison {
    private _filter_nom: string | null = null;
    get filter_nom(): string | null {
      return this._filter_nom;
    }
    set filter_nom(value: string | null) {
      this._filter_nom = value;
      this.onFilterChange();
    }
  
    private _filter_date_debut_avant: Date | null = null;
    get filter_date_debut_avant(): Date | null {
      return this._filter_date_debut_avant;
    }
    set filter_date_debut_avant(value: Date | null) {
      this._filter_date_debut_avant = value;
      this.onFilterChange();
    }
  
    private _filter_date_debut_apres: Date | null = null;
    get filter_date_debut_apres(): Date | null {
      return this._filter_date_debut_apres;
    }
    set filter_date_debut_apres(value: Date | null) {
      this._filter_date_debut_apres = value;
      this.onFilterChange();
    }

    private _filter_date_fin_avant: Date | null = null;
    get filter_date_fin_avant(): Date | null {
      return this._filter_date_fin_avant;
    }
    set filter_date_fin_avant(value: Date | null) {
      this._filter_date_fin_avant = value;
      this.onFilterChange();
    }
  
    private _filter_date_fin_apres: Date | null = null;
    get filter_date_fin_apres(): Date | null {
      return this._filter_date_fin_apres;
    }
    set filter_date_fin_apres(value: Date | null) {
      this._filter_date_fin_apres = value;
      this.onFilterChange();
    }
  
  
    private _filter_active: boolean | null = null;
    get filter_active(): boolean | null {
      return this._filter_active;
    }
    set filter_active(value: boolean | null) {
      this._filter_active = value;
      this.onFilterChange();
    }
  
   
  
    private onFilterChange(): void {}
  }

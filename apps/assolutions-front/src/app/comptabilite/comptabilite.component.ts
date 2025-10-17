import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AddInfoService } from '../../services/addinfo.service';
import { ComptabiliteService } from '../../services/comptabilite.service';
import { CompteBancaireService } from '../../services/compte-bancaire.service';
import { ErrorService } from '../../services/error.service';
import { OperationService } from '../../services/operation.service';
import { SaisonService } from '../../services/saison.service';
import { StockService } from '../../services/stock.service';
import { ClassComptable,  TypeStock, StaticClass } from '../global';
import { Saison_VM } from '@shared/lib/saison.interface';
import { CompteBancaire_VM, FluxFinancier_VM, GenericLink_VM, Operation_VM, Stock_VM, ValidationItem } from '@shared/index';

@Component({
  standalone: false,
  selector: 'app-comptabilite',
  templateUrl: './comptabilite.component.html',
  styleUrls: ['./comptabilite.component.css'],
})
export class ComptabiliteComponent implements OnInit {

  active_saison: number;
  liste_saison: Saison_VM[];
  FluxFinanciers: FluxFinancier_VM[];
  editFluxFlinancier: FluxFinancier_VM;
  stocks: GenericLink_VM[];
  liste_compte_bancaire: CompteBancaire_VM[];
  
      public filters: filterFF = new filterFF();  

  sort_libelle_ff: string = 'NO';
  sort_date_ff: string = 'NO';
  sort_montant_ff: string = 'NO';
  sort_sens_ff: string = 'NO';
  action = '';
  liste_destintaire: GenericLink_VM[] = [];
  liste_lieu: GenericLink_VM[] = [];
  

  
    @ViewChild('scrollableContent', { static: false })
    scrollableContent!: ElementRef;
    showScrollToTop: boolean = false;

  vue: 'COMPTA' | 'BUDGET' | 'LISTE'  = 'LISTE';

   public loading: boolean = false;
        public afficher_filtre: boolean = false;
        public selected_filter : string = null;

        rLibelle:ValidationItem ={key:true, value:''};
        is_valid:boolean = false;

        histo:string;

  constructor(
    public compta_serv: ComptabiliteService,
    public trns_serv: OperationService,
    public saison_sev: SaisonService,
    public cb_serv: CompteBancaireService,
    public ai_serv: AddInfoService,
    public router: Router,
    public route: ActivatedRoute,
    public SC: StaticClass,
    public addinfo_serv: AddInfoService,
    public stock_serv: StockService
  ) {}
  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if ('vue' in params) {
        this.vue = params['vue'];
      }
    });
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les saisons`;
    this.saison_sev
      .GetAll()
      .then((liste_saison) => {
        this.liste_saison = liste_saison;
        this.active_saison = liste_saison.find((x) => x.active == true).id;
        this.action = $localize`Charger les comptes`;
        this.cb_serv
          .getAll()
          .then((cpts) => {
            this.liste_compte_bancaire = cpts;
            this.action = $localize`Charger les classes comptables`;
            if (!this.SC.ClassComptable || this.SC.ClassComptable.length == 0) {
              this.addinfo_serv.get_lv('class_compta', true).then((liste) => {
                this.SC.ClassComptable = JSON.parse(liste.text);
              });
            } 
            if (!this.SC.TypeStock || this.SC.TypeStock.length == 0) {
              this.addinfo_serv.get_lv('stock',true).then((liste) => {
                this.SC.TypeStock = JSON.parse(liste.text);
              });
            } 
            if (!this.SC.ListeObjet || this.SC.ListeObjet.length == 0) {
              let ab: string[] = ['rider','compte', 'lieu', 'prof'];
              this.addinfo_serv.getall_liste(ab).then((liste) => {
                this.SC.ListeObjet = liste;
                this.liste_destintaire = this.SC.ListeObjet.filter(
                  (x) =>
                    x.type == 'rider' || x.type == 'compte' || x.type == 'prof'
                );
                this.liste_lieu = this.SC.ListeObjet.filter(
                  (x) =>
                    x.type == 'rider' || x.type == 'lieu' || x.type == 'autre'
                );
              });
            } else {
              this.liste_destintaire = this.SC.ListeObjet.filter(
                (x) =>
                  x.type == 'rider' || x.type == 'compte' || x.type == 'prof'
              );
            }
            this.VoirSituation();
          })
          .catch((err: HttpErrorResponse) => {
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
          });
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }
  getActiveSaison(): string {
    let s = this.liste_saison.find((x) => x.id == this.active_saison);
    if (s) {
      return s.nom;
    } else {
      return '';
    }
  }
  VoirSituation() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la situation`;
    this.compta_serv.getAllSeason(this.active_saison).then((liste) =>{
      this.FluxFinanciers = liste;
    })
    // this.compta_serv.VoirSituation(this.saison_id).then((ff) => {
    //   this.FluxFinanciers = ff.map((x) => new FluxFinancier(x));

    //   this.FluxFinanciers.forEach((fluxf) => {
    //     try {
    //       let lib_dest = JSON.parse(fluxf.datasource.destinataire);
    //       fluxf.DestinataireLibelle = lib_dest.value;
    //     } catch (error) {
    //       console.log(error);
    //       fluxf.DestinataireLibelle = ''; // Définit une chaîne vide en cas d'erreur
    //     }
    //     fluxf.liste_operation.forEach((ttr) => {
    //       try {
    //         let lib_dest = JSON.parse(ttr.datasource.destinataire);
    //         ttr.DestinataireLibelle = lib_dest.value;
    //       } catch (error) {
    //         ttr.DestinataireLibelle = ''; // Définit une chaîne vide en cas d'erreur
    //       }
    //     });
    //   });
    // });
  }

  Sort_ff(sens: 'NO' | 'ASC' | 'DESC', champ: string) {
    switch (champ) {
      case 'libelle':
        this.sort_libelle_ff = sens;
        this.sort_date_ff = 'NO';
        this.sort_montant_ff = 'NO';
        this.sort_sens_ff = 'NON';
        this.FluxFinanciers.sort((a, b) => {
          const nomA = a.libelle.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.libelle.toUpperCase();
          let comparaison = 0;
          if (nomA > nomB) {
            comparaison = 1;
          } else if (nomA < nomB) {
            comparaison = -1;
          }

          return this.sort_libelle_ff === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
case 'sens':
        this.sort_date_ff = sens;
        this.sort_libelle_ff = 'NO';
        this.sort_montant_ff = 'NO';
        this.sort_sens_ff = 'NO';
        this.FluxFinanciers.sort((a, b) => {
          let dateA = a.date;
          let dateB = b.date;

          let comparaison = 0;
          if (dateA > dateB) {
            comparaison = 1;
          } else if (dateA < dateB) {
            comparaison = -1;
          }

          return this.sort_date_ff === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case 'date':
        this.sort_date_ff = sens;
        this.sort_libelle_ff = 'NO';
        this.sort_montant_ff = 'NO';
        this.sort_sens_ff = 'NO';
        this.FluxFinanciers.sort((a, b) => {
          let dateA = a.date;
          let dateB = b.date;

          let comparaison = 0;
          if (dateA > dateB) {
            comparaison = 1;
          } else if (dateA < dateB) {
            comparaison = -1;
          }

          return this.sort_date_ff === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case 'montant':
        this.sort_libelle_ff = 'NO';
        this.sort_date_ff = 'NO';
        this.sort_sens_ff = 'NO';
        this.sort_montant_ff = sens;
        this.FluxFinanciers.sort((a, b) => {
          const soldeA = a.montant; // Ignore la casse lors du tri
          const soldeB = b.montant;
          let comparaison = 0;
          if (soldeA > soldeB) {
            comparaison = 1;
          } else if (soldeA < soldeB) {
            comparaison = -1;
          }

          return this.sort_montant_ff === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case 'sens':
        this.sort_libelle_ff = 'NO';
        this.sort_date_ff = 'NO';
        this.sort_sens_ff = sens;
        this.sort_montant_ff = 'NO';
        this.FluxFinanciers.sort((a, b) => {
          const soldeA = a.recette; // Ignore la casse lors du tri
          const soldeB = b.recette;
          let comparaison = 0;
          if (soldeA > soldeB) {
            comparaison = 1;
          } else if (soldeA < soldeB) {
            comparaison = -1;
          }

          return this.sort_sens_ff === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
    }
  }

  Payer_ff(t: FluxFinancier_VM) {
    t.statut = 1;
    const errorService = ErrorService.instance;
    this.action = $localize`Mettre à jour une flux`;
    this.compta_serv.update(t).then((ok) => {
      if (ok) {
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
        t.liste_operation.forEach((ope) => {
          this.action = $localize`Mettre à jour une opération`;
          ope.paiement_execute = true;
          this.trns_serv
            .update(ope)
            .then((ret) => {
              if (!ret) {
                let o = errorService.UnknownError(this.action);
                errorService.emitChange(o);
              }
            })
            .catch((err: HttpErrorResponse) => {
              let o = errorService.CreateError(this.action, err.message);
              errorService.emitChange(o);
            });
        });
      }
    });
  }

  autoSave(){
    if(this.is_valid){
      this.Save_ff();
    }
  }



  Save_ff() {
    const errorService = ErrorService.instance;
    this.action = $localize`Mettre à jour une flux`;
    let h = JSON.stringify(this.histo);

    if (this.editFluxFlinancier.id == -1) {
      this.compta_serv
        .add(this.editFluxFlinancier)
        .then((ffx) => {
          this.editFluxFlinancier.id = ffx.id;
          this.editFluxFlinancier.liste_operation.forEach((ope) => {
            ope.flux_financier_id = ffx.id;
            this.action = $localize`Ajouter une opération`;
            this.trns_serv
              .add(ope)
              .then((idop) => {
                ope.id = idop.id;
              })
              .catch((err: HttpErrorResponse) => {
                let o = errorService.CreateError(this.action, err.message);
                errorService.emitChange(o);
              });
          });
          this.editFluxFlinancier.liste_stock.forEach((ope) => {
            ope.flux_financier_id = ffx.id;
            this.action = $localize`Ajouter un stock`;
            this.stock_serv
              .add(ope)
              .then((idop) => {
                ope.id = idop;
              })
              .catch((err: HttpErrorResponse) => {
                let o = errorService.CreateError(this.action, err.message);
                errorService.emitChange(o);
              });
          });
        })
        .catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
    } else {
      this.compta_serv
        .update(this.editFluxFlinancier)
        .then((ok) => {
          if (ok) {
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.editFluxFlinancier.liste_operation.forEach((ope) => {
              if (ope.id == 0) {
                ope.flux_financier_id = this.editFluxFlinancier.id;
                this.action = $localize`Ajouter une opération`;
                this.trns_serv
                  .add(ope)
                  .then((operation_vm) => {
                    ope.id = operation_vm.id;
                  })
                  .catch((err: HttpErrorResponse) => {
                    let o = errorService.CreateError(this.action, err.message);
                    errorService.emitChange(o);
                  });
              } else {
                this.action = $localize`Mettre à jour une opération`;
                this.trns_serv
                  .update(ope)
                  .then((ret) => {
                    if (!ret) {
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
            this.editFluxFlinancier.liste_stock.forEach((ope) => {
              if (ope.id == 0) {
                ope.flux_financier_id = this.editFluxFlinancier.id;
                this.action = $localize`Ajouter un stcok`;
                this.stock_serv
                  .add(ope)
                  .then((idop) => {
                    ope.id = idop;
                  })
                  .catch((err: HttpErrorResponse) => {
                    let o = errorService.CreateError(this.action, err.message);
                    errorService.emitChange(o);
                  });
              } else {
                this.action = $localize`Mettre à jour un stock`;
                this.stock_serv
                  .update(ope)
                  .then((ret) => {
                    if (!ret) {
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

  isOKCreate(): boolean {
    if (this.editFluxFlinancier.libelle.length === 0) {
      return true;
    }
    if (!this.editFluxFlinancier.classe_comptable) {
      return true;
    }
    if (this.editFluxFlinancier.montant == 0) {
      return true;
    }
    if (!this.editFluxFlinancier.date) {
      return true;
    }
    if (!this.editFluxFlinancier.destinataire) {
      return true;
    }
    if (
      this.editFluxFlinancier.nb_paiement < 1 ||
      this.editFluxFlinancier.nb_paiement > 36
    ) {
      return true;
    }
    return false;
  }
  isValid() {
    if (this.isOKCreate()) {
      return true;
    }
    let solde: number = 0;
    let ret = false;
    this.editFluxFlinancier.liste_operation.forEach((ope) => {
      solde = Number(solde) + Number(ope.solde);
      if (!ope.destinataire) {
        ret = true;
      }
      if (!ope.date_operation) {
        ret = true;
      }
      if (!ope.mode) {
        ret = true;
      }
    });
    if (
      solde != this.editFluxFlinancier.montant &&
      solde != -this.editFluxFlinancier.montant
    ) {
      ret = true;
    }
    return ret;
  }

  FFByClass(ff: number): FluxFinancier_VM[] {
    return this.FluxFinanciers.filter((x) => x.classe_comptable == ff);
  }
  
  VoirClasse(cl:number){
    this.vue = "COMPTA";
    this.FluxFinanciers = this.FFByClass(cl);
    this.editFluxFlinancier = null;
  }

  trouverclasse(cl:number){
    return this.SC.ClassComptable.find(x => x.numero == cl).libelle;
  }
    trouverDestinataire(cl:string){
    return this.liste_destintaire.find(x => x.value.toLowerCase().includes(cl.toLowerCase())).value;
  }

  Retour_menu() {
    let h = JSON.stringify(this.editFluxFlinancier);
    if(h !== this.histo){
      let c = window.confirm($localize`Des modifications ont été détectées ? En revenant en arrière, vous perdez les modifications non sauvegardées ?`);
      if(c){
        this.editFluxFlinancier = null;
      }
    } else {
    this.editFluxFlinancier = null;

    }
  }

  Edit_ff(id: number) { 
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer une opération`;
    this.compta_serv.get(id).then((FF) =>{
      this.editFluxFlinancier = FF;
      this.histo = JSON.stringify(this.editFluxFlinancier);
    })
  }

  Delete_ff(id:number){
    
  }
  onInputChange(displayText: GenericLink_VM) {
    // Trouver l'objet complet correspondant à la valeur d'affichage
    const selectedOption = this.liste_destintaire.find(
      (option) => option === displayText
    );
    if (selectedOption) {
      // Mettre à jour l'affichage et le modèle avec l'objet sélectionné
      this.editFluxFlinancier.destinataire = displayText;
    } else {
      // Gérer les saisies libres si nécessaire
      this.editFluxFlinancier.destinataire = {
        id: 0,
        type: '',
        value: displayText.value,
      };
     
    }
  }
  onInputChangeList(displayText: GenericLink_VM, cpt: Operation_VM) {
    // Trouver l'objet complet correspondant à la valeur d'affichage
    const selectedOption = this.liste_destintaire.find(
      (option) => option === displayText
    );
    if (selectedOption) {
      // Mettre à jour l'affichage et le modèle avec l'objet sélectionné
      cpt.destinataire = displayText;
    } else {
      // Gérer les saisies libres si nécessaire
      cpt.destinataire = {
        id: 0,
        type: '',
        value: displayText.value,
      };
     
    }
  }
  onInputChangeListStock(displayText: GenericLink_VM, cpt: Stock_VM) {
   const selectedOption = this.liste_destintaire.find(
      (option) => option === displayText
    );
    if (selectedOption) {
      // Mettre à jour l'affichage et le modèle avec l'objet sélectionné
      cpt.lieu_stockage = displayText;
    } else {
      // Gérer les saisies libres si nécessaire
      cpt.lieu_stockage = {
        id: 0,
        type: '',
        value: displayText.value,
      };
     
    }
  }

  Delete_stock(t: Stock_VM) {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer un stock`;
    if (t.id > 0) {
      this.stock_serv
        .delete(t.id)
        .then((ret) => {
          if (ret) {
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.editFluxFlinancier.liste_stock =
              this.editFluxFlinancier.liste_stock.filter(
                (x) => x.id !== t.id
              );
          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
          }
        })
        .catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
    } else {
      this.editFluxFlinancier.liste_stock =
        this.editFluxFlinancier.liste_stock.filter(
          (x) => x.temp_id !== t.temp_id
        );
      let o = errorService.OKMessage(this.action);
      errorService.emitChange(o);
    }
  }
  Reinit_Filter(){
     this.filters.filter_date_debut_ff = null
  this.filters.filter_date_fin_ff = null
  this.filters.filter_libelle_ff = null
  this.filters.filter_classe_ff = null
  this.filters.filter_type_achat_ff = null
  this.filters.filter_montant_min_ff = null
  this.filters.filter_montant_max_ff = null
  this.filters.filter_sens_operation_ff = null
  this.filters.filter_destinataire_ff = null
  }

  Ajouter(numero: number = null) {
    let ff = new FluxFinancier_VM();
    this.editFluxFlinancier = ff;
    this.editFluxFlinancier.date = new Date();
    if (numero) {
      this.editFluxFlinancier.classe_comptable = numero;
    }
  }

  getCompte(id: number): CompteBancaire_VM {
    return this.liste_compte_bancaire.find((x) => x.id == id);
  }

  GoToType(type_: string, id: number) {
    switch (type_) {
      case 'rider':
        this.router.navigate(['/adherent'], { queryParams: { id: id } });
        break;
    }
  }
  ExportExcel(){

  }

  AppliquerPaiement() {
    this.editFluxFlinancier.liste_operation = [];
    for (let index = 1; index <= this.editFluxFlinancier.nb_paiement; index++) {
      let ts: Operation_VM = new Operation_VM();
      ts.date_operation = this.editFluxFlinancier.date;
      ts.flux_financier_id = this.editFluxFlinancier.id;
      ts.paiement_execute = this.editFluxFlinancier.statut == 1? true : false;
      ts.destinataire = this.editFluxFlinancier.destinataire;
      ts.info = this.editFluxFlinancier.libelle;
      ts.solde =
        this.editFluxFlinancier.montant / this.editFluxFlinancier.nb_paiement;

      ts.destinataire = this.editFluxFlinancier.destinataire;

      this.editFluxFlinancier.liste_operation.push(ts);
      //créer autant de paiement nécessaire
      this.editFluxFlinancier.id = -1;
    }
  }
  formatDestinataire(destinataire: GenericLink_VM) {
    return `${destinataire.value} (${destinataire.type})`;
  }
  Delete(t: Operation_VM) {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer un paiement`;
    if (this.editFluxFlinancier.liste_operation.length == 1) {
      let o = errorService.Warning(
        this.action + ' : ' + $localize`Il doit y avoir au moins 1 paiement`
      );
      errorService.emitChange(o);
    } else {
      this.editFluxFlinancier.liste_operation =
        this.editFluxFlinancier.liste_operation.filter((x) => x !== t);
    }
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

export class filterFF {
  filter_date_debut_ff: Date = null
  filter_date_fin_ff: Date = null
  filter_libelle_ff: string = null
  filter_classe_ff: number = null
  filter_type_achat_ff: number = null
  filter_montant_min_ff: number = null
  filter_montant_max_ff: number = null
  filter_sens_operation_ff: boolean = null
  filter_destinataire_ff: string = null
}

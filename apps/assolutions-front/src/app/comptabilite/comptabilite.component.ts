import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
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
import { CompteBancaire_VM, FluxFinancier_VM, GenericLink_VM, Operation_VM, Stock_VM } from '@shared/index';

@Component({
  standalone: false,
  selector: 'app-comptabilite',
  templateUrl: './comptabilite.component.html',
  styleUrls: ['./comptabilite.component.css'],
})
export class ComptabiliteComponent implements OnInit {
  filter_date_debut_ff: Date;
  filter_date_fin_ff: Date;
  filter_libelle_ff: string;
  filter_classe_ff: number;
  afficher_filtre_ff: boolean = false;
  filter_montant_min_ff: number = 0;
  filter_montant_max_ff: number;
  filter_sens_operation_ff: boolean = null;
  filter_sens_ff: boolean = null;
  saison_id: number;
  saisons: Saison_VM[];
  FluxFinanciers: FluxFinancier_VM[];
  editFluxFlinancier: FluxFinancier_VM;
  ClassesComptable: ClassComptable[];
  stocks: Stock_VM[];
  Comptes: CompteBancaire_VM[];

  sort_libelle_ff: string = 'NO';
  sort_date_ff: string = 'NO';
  sort_montant_ff: string = 'NO';
  sort_sens_ff: string = 'NO';
  action = '';
  Destinataire: GenericLink_VM[] = [];
  Liste_Lieu: GenericLink_VM[] = [];
  TypeStock: TypeStock[] = [];
  destinataireInput: string = '';

  context: 'FLUXFIN' | 'COMPTA' | 'LISTE' | 'EDIT_FLUXFIN' = 'COMPTA';
  ancien_context: 'FLUXFIN' | 'COMPTA' | 'LISTE' | 'EDIT_FLUXFIN' = 'LISTE';

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
      if ('context' in params) {
        this.context = params['context'];
      }
    });
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les saisons`;
    this.saison_sev
      .GetAll()
      .then((liste_saison) => {
        this.saisons = liste_saison;
        this.saison_id = liste_saison.find((x) => x.active == true).id;
        this.action = $localize`Charger les comptes`;
        this.cb_serv
          .getAll()
          .then((cpts) => {
            this.Comptes = cpts;
            this.action = $localize`Charger les classes comptables`;
            if (!this.SC.ClassComptable || this.SC.ClassComptable.length == 0) {
              this.addinfo_serv.get_lv('class_compta', true).then((liste) => {
                this.SC.ClassComptable = JSON.parse(liste.text);
                console.log(this.SC.ClassComptable);
                this.ClassesComptable = this.SC.ClassComptable;
              });
            } else {
              this.ClassesComptable = this.SC.ClassComptable;
            }
            if (!this.SC.TypeStock || this.SC.TypeStock.length == 0) {
              this.addinfo_serv.get_lv('stock',true).then((liste) => {
                this.SC.TypeStock = JSON.parse(liste.text);
                this.TypeStock = this.SC.TypeStock;
              });
            } else {
              this.TypeStock = this.SC.TypeStock;
            }
            this.VoirSituation();
            if (!this.SC.ListeObjet || this.SC.ListeObjet.length == 0) {
              let ab: string[] = ['rider','compte', 'lieu', 'prof'];
              this.addinfo_serv.getall_liste(ab).then((liste) => {
                this.SC.ListeObjet = liste;
                this.Destinataire = this.SC.ListeObjet.filter(
                  (x) =>
                    x.type == 'rider' || x.type == 'compte' || x.type == 'prof'
                );
                this.Liste_Lieu = this.SC.ListeObjet.filter(
                  (x) =>
                    x.type == 'rider' || x.type == 'lieu' || x.type == 'autre'
                );
              });
            } else {
              this.Destinataire = this.SC.ListeObjet.filter(
                (x) =>
                  x.type == 'rider' || x.type == 'compte' || x.type == 'prof'
              );
            }
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
  VoirSituation() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la situation`;

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
        this.sort_montant_ff = 'NON';
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

      case 'date':
        this.sort_date_ff = sens;
        this.sort_libelle_ff = 'NO';
        this.sort_montant_ff = 'NO';
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
    }
  }

  ReinitFiltre_ff() {
    this.filter_classe_ff = null;
    this.filter_date_debut_ff = null;
    this.filter_libelle_ff = null;
    this.filter_montant_max_ff = null;
    this.filter_montant_min_ff = null;
    this.filter_date_fin_ff = null;
  }
  ExporterExcel_ff() {}

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

  Save_ff() {
    const errorService = ErrorService.instance;
    this.action = $localize`Mettre à jour une flux`;
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

  IsCC(cl: { numero: string; libelle: string }): boolean {
    return (
      this.FluxFinanciers.filter((x) => x.classe_comptable == cl.numero).length >
      0
    );
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

  FFByClass(ff: string): FluxFinancier_VM[] {
    return this.FluxFinanciers.filter((x) => x.classe_comptable == ff);
  }
  AjouterDoc() {}

  AjouterPaiement_ff() {
    let newValue = new Operation_VM();
    newValue.flux_financier_id = this.editFluxFlinancier.id;
    newValue.date_operation = this.editFluxFlinancier.date;
    newValue.destinataire = this.editFluxFlinancier.destinataire;
    let max_id = 1;
    let total = 0;
    this.editFluxFlinancier.liste_operation.forEach((f) => {
      total += f.solde;
      if (f.temp_id && f.temp_id >= max_id) {
        max_id++;
      }
    });
    newValue.solde = this.editFluxFlinancier.montant - total;
    newValue.paiement_execute = true;
    newValue.temp_id = max_id;
    this.editFluxFlinancier.liste_operation.push(newValue);
  }
  Ajouter_Stock() {
    let s = new Stock_VM();
    s.date_achat = this.editFluxFlinancier.date;
    s.flux_financier_id = this.editFluxFlinancier.id;
    s.id = 0;
    s.qte = 1;
    let max_id = 1;
    this.editFluxFlinancier.liste_stock.forEach((f) => {
      if (f.temp_id && f.temp_id >= max_id) {
        max_id++;
      }
    });
    this.editFluxFlinancier.liste_stock.push(s);
  }
  Remove_liste(cpt: Operation_VM) {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer une opération`;
    if (cpt.id > 0) {
      this.trns_serv
        .Delete(cpt.id)
        .then(() => {
          let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.editFluxFlinancier.liste_operation =
              this.editFluxFlinancier.liste_operation.filter(
                (x) => x.id !== cpt.id
              );
        })
        .catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
    } else {
      this.editFluxFlinancier.liste_operation =
        this.editFluxFlinancier.liste_operation.filter(
          (x) => x.temp_id !== cpt.temp_id
        );
      let o = errorService.OKMessage(this.action);
      errorService.emitChange(o);
    }
  }

  Retour_menu() {
    this.context = this.ancien_context;
    this.editFluxFlinancier = null;
  }

  Edit_ff(id: number) {
  
  }
  onInputChange(displayText: GenericLink_VM) {
    // Trouver l'objet complet correspondant à la valeur d'affichage
    const selectedOption = this.Destinataire.find(
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
    const selectedOption = this.Destinataire.find(
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
   const selectedOption = this.Destinataire.find(
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
  Delete_ff(ff: FluxFinancier_VM) {}
  Read_ff(ff: FluxFinancier_VM) {}

  Ajouter(numero: string = null) {
    this.context = 'EDIT_FLUXFIN';
    let ff = new FluxFinancier_VM();
    this.editFluxFlinancier = ff;
    this.editFluxFlinancier.date = new Date();
    if (numero) {
      this.editFluxFlinancier.classe_comptable = numero;
    }
  }

  getCompte(id: number): CompteBancaire_VM {
    return this.Comptes.find((x) => x.id == id);
  }

  GoToType(type_: string, id: number) {
    switch (type_) {
      case 'rider':
        this.router.navigate(['/adherent'], { queryParams: { id: id } });
        break;
    }
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
}

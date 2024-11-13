import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CompteBancaire } from 'src/class/comptebancaire';
import { fluxfinancier, FluxFinancier } from 'src/class/fluxfinancier';
import { saison } from 'src/class/saison';
import { stock } from 'src/class/stock';
import { operation, Operation } from 'src/class/operation';
import { AddInfoService } from 'src/services/addinfo.service';
import { ComptabiliteService } from 'src/services/comptabilite.service';
import { CompteBancaireService } from 'src/services/compte-bancaire.service';
import { ErrorService } from 'src/services/error.service';
import { SaisonService } from 'src/services/saison.service';
import { operationService } from 'src/services/operation.service';
import { StaticClass } from '../global';

@Component({
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
  saisons: saison[];
  FluxFinanciers: FluxFinancier[];
  editFluxFlinancier: FluxFinancier;
  ClassesComptable: { numero: number; libelle: string }[];
  stocks: stock[];
  Comptes: CompteBancaire[];

  sort_libelle_ff: string = 'NO';
  sort_date_ff: string = 'NO';
  sort_montant_ff: string = 'NO';
  sort_sens_ff: string = 'NO';
  action = '';
  Destinataire: {
    id: number;
    type: 'stock' | 'rider' | 'lieu' | 'prof' | 'compte' | 'autre';
    value: string;
  }[] = [];
  destinataireInput: string = '';

  context: 'FLUXFIN' | 'COMPTA' | 'EDIT_FLUXFIN' = 'COMPTA';

  constructor(
    public compta_serv: ComptabiliteService,
    public trns_serv: operationService,
    public saison_sev: SaisonService,
    public cb_serv: CompteBancaireService,
    public ai_serv: AddInfoService,
    public router: Router,
    public route: ActivatedRoute,
    public SC: StaticClass,
    public addinfo_serv: AddInfoService
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
          .GetAll()
          .then((cpts) => {
            this.Comptes = cpts;
            this.action = $localize`Charger les classes comptables`;
            if (!this.SC.ClassComptable || this.SC.ClassComptable.length == 0) {
              this.addinfo_serv.GetLV('class_compta').then((liste) => {
                this.SC.ClassComptable = JSON.parse(liste);
                this.ClassesComptable = this.SC.ClassComptable;
              });
            } else {
              this.ClassesComptable = this.SC.ClassComptable;
            }
            this.VoirSituation();
            if (!this.SC.ListeObjet || this.SC.ListeObjet.length == 0) {
              this.addinfo_serv.GetObjet().then((liste) => {
                this.SC.ListeObjet = liste;
                this.Destinataire = this.SC.ListeObjet.filter(
                  (x) =>
                    x.type == 'rider' || x.type == 'compte' || x.type == 'prof'
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

    this.compta_serv.VoirSituation(this.saison_id).then((ff) => {
      this.FluxFinanciers = ff.map((x) => new FluxFinancier(x));
      this.FluxFinanciers.forEach((fluxf) => {
        fluxf.liste_operation.forEach((ttr) => {
          let lib_dest = JSON.parse(ttr.datasource.destinataire);
          ttr.DestinataireLibelle = lib_dest.value;
        });
      });
    });
  }

  Sort_ff(sens: 'NO' | 'ASC' | 'DESC', champ: string) {
    switch (champ) {
      case 'libelle':
        this.sort_libelle_ff = sens;
        this.sort_date_ff = 'NO';
        this.sort_montant_ff = 'NON';
        this.FluxFinanciers.sort((a, b) => {
          const nomA = a.Libelle.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.Libelle.toUpperCase();
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
          let dateA = new Date(a.Date);
          let dateB = new Date(b.Date);

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
          const soldeA = a.Montant; // Ignore la casse lors du tri
          const soldeB = b.Montant;
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

  Payer_ff(t: FluxFinancier) {}

  Save_ff() {
    const errorService = ErrorService.instance;
    this.action = $localize`Mettre à jour une flux`;
    if (this.editFluxFlinancier.ID == 0) {
      this.compta_serv
        .Add(this.editFluxFlinancier.datasource)
        .then((id) => {
          this.editFluxFlinancier.ID = id;
        })
        .catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
    } else {
      this.compta_serv
        .Update(this.editFluxFlinancier.datasource)
        .then((ok) => {
          if (ok) {
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

  IsCC(cl: { numero: number; libelle: string }): boolean {
    return true;
  }
  FFByClass(ff:number): FluxFinancier[] {
      return this.FluxFinanciers.filter(x => x.ClasseComptable.numero == ff);
  }

  AjouterPaiement_ff() {
    let t = new operation();
    let newValue = new Operation(t, this.editFluxFlinancier.Libelle);
    newValue.Date = this.editFluxFlinancier.Date;
    newValue.Destinataire = this.editFluxFlinancier.Destinataire;
    let max_id = 1;
    let total = 0;
    this.editFluxFlinancier.liste_operation.forEach((f) => {
      total += f.Solde;
      if (f.temp_id && f.temp_id >= max_id) {
        max_id++;
      }
    });
    newValue.Solde = this.editFluxFlinancier.Montant - total;
    newValue.IsRecette = this.editFluxFlinancier.IsRecette;
    newValue.StatutPaiement = 1;
    newValue.temp_id = max_id;
    this.editFluxFlinancier.liste_operation.push(newValue);
  }
  Ajouter_Stock() {
    let s = new stock();
    s.date_achat = this.editFluxFlinancier.Date;
    s.flux_financier_id = this.editFluxFlinancier.ID;
    s.id = 0;
    s.qte = 1;
    this.editFluxFlinancier.liste_stock.push(s);
  }
  Remove_liste(cpt: Operation) {
    if (cpt.ID > 0) {
      this.editFluxFlinancier.liste_operation =
        this.editFluxFlinancier.liste_operation.filter((x) => x.ID !== cpt.ID);
    } else {
      this.editFluxFlinancier.liste_operation =
        this.editFluxFlinancier.liste_operation.filter(
          (x) => x.temp_id !== cpt.temp_id
        );
    }
  }

  Edit_ff(id: number) {
    this.context = 'EDIT_FLUXFIN';
    const errorService = ErrorService.instance;
    this.action = $localize`Charger une ligne comptable`;
    this.compta_serv
      .Get(id)
      .then((ff) => {
        this.editFluxFlinancier = new FluxFinancier(ff);
        this.initializeDisplayValue();
        this.trns_serv.GetByFF(ff.id).then((paiements) => {
          this.editFluxFlinancier.liste_operation = paiements.map(
            (x) => new Operation(x, ff.libelle)
          );
          this.editFluxFlinancier.liste_operation.forEach((ope) => {
            const currentDestinataire = JSON.parse(ope.Destinataire);

            // Vérification avec conversion pour s'assurer que les types sont identiques
            const matchingOption = this.Destinataire.find(
              (option) =>
                option.id === currentDestinataire?.id &&
                option.type === currentDestinataire?.type
            );

            if (matchingOption) {
              ope.DestinataireLibelle = this.formatDestinataire(matchingOption);
            } else {
              ope.DestinataireLibelle = currentDestinataire?.value || '';
            }
          });
        });
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }
  initializeDisplayValue() {
    const currentDestinataire = JSON.parse(
      this.editFluxFlinancier.Destinataire
    );

    // Vérification avec conversion pour s'assurer que les types sont identiques
    const matchingOption = this.Destinataire.find(
      (option) =>
        option.id === currentDestinataire?.id &&
        option.type === currentDestinataire?.type
    );

    if (matchingOption) {
      this.editFluxFlinancier.DestinataireLibelle =
        this.formatDestinataire(matchingOption);
    } else {
      this.editFluxFlinancier.DestinataireLibelle =
        currentDestinataire?.value || '';
    }
  }
  onInputChange(displayText: string) {
    // Trouver l'objet complet correspondant à la valeur d'affichage
    const selectedOption = this.Destinataire.find(
      (option) => this.formatDestinataire(option) === displayText
    );
    if (selectedOption) {
      // Mettre à jour l'affichage et le modèle avec l'objet sélectionné
      this.editFluxFlinancier.DestinataireLibelle = displayText;
      this.editFluxFlinancier.Destinataire = selectedOption;
      this.editFluxFlinancier.datasource.destinataire =
        JSON.stringify(selectedOption);
    } else {
      // Gérer les saisies libres si nécessaire
      this.editFluxFlinancier.Destinataire = {
        id: 0,
        type: '',
        value: displayText,
      };
      this.editFluxFlinancier.datasource.destinataire = JSON.stringify(
        this.editFluxFlinancier.Destinataire
      );
    }
  }

  Delete_stock(t: stock) {
    this.editFluxFlinancier.liste_stock =
      this.editFluxFlinancier.liste_stock.filter((x) => x !== t);
  }
  Delete_ff(ff: FluxFinancier) {}
  Read_ff(ff: FluxFinancier) {}

  Ajouter() {
    this.context = 'EDIT_FLUXFIN';
    let ff = new fluxfinancier();
    ff.date = new Date().toString();
    this.editFluxFlinancier = new FluxFinancier(ff);
  }

  getCompte(id: number): CompteBancaire {
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
    for (let index = 1; index <= this.editFluxFlinancier.NbPaiement; index++) {
      let ts: operation = new operation();
      ts.date_operation = this.editFluxFlinancier.Date;
      ts.flux_financier_id = this.editFluxFlinancier.ID;
      ts.paiement_execute = this.editFluxFlinancier.Statut;
      ts.info = this.editFluxFlinancier.Libelle;
      ts.solde =
        this.editFluxFlinancier.Montant / this.editFluxFlinancier.NbPaiement;
      this.editFluxFlinancier.liste_operation.push(
        new Operation(ts, this.editFluxFlinancier.Libelle)
      );
      //créer autant de paiement nécessaire
    }
  }
  formatDestinataire(destinataire: {
    id: number;
    type: 'stock' | 'rider' | 'lieu' | 'prof' | 'compte' | 'autre';
    value: string;
  }) {
    return `${destinataire.value} (${destinataire.type})`;
  }
  Delete(t: Operation) {
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

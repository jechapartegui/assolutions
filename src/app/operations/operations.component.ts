import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AddInfoService } from 'src/services/addinfo.service';
import { ComptabiliteService } from 'src/services/comptabilite.service';
import { CompteBancaireService } from 'src/services/compte-bancaire.service';
import { operationService } from 'src/services/operation.service';
import { SaisonService } from 'src/services/saison.service';
import { StaticClass } from '../global';
import { ErrorService } from 'src/services/error.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Operation } from 'src/class/operation';
import { CompteBancaire } from 'src/class/comptebancaire';
import { saison } from 'src/class/saison';
import { FluxFinancier } from 'src/class/fluxfinancier';

@Component({
  selector: 'app-operations',
  templateUrl: './operations.component.html',
  styleUrls: ['./operations.component.css'],
})
export class OperationsComponent implements OnInit {
  afficher_filtre: boolean = false;
  filter_compte: number = 0;
  filter_date_debut: Date;
  filter_date_fin: Date;
  filter_libelle: string;
  filter_montant_min: number = 0;
  filter_montant_max: number;
  filter_sens_operation: boolean = null;
  Operations: Operation[];
  editOperations: Operation;
  ClassesComptable: { numero: number; libelle: string }[];
  Comptes: CompteBancaire[];
  saison_id: number;
  saisons: saison[];
  sort_libelle: string = 'NO';
  sort_date: string = 'NO';
  sort_sens: string = 'NO';
  sort_montant: string = 'NO';
  action = '';
  Destinataire: {
    id: number;
    type: 'stock' | 'rider' | 'lieu' | 'prof' | 'compte' | 'autre';
    value: string;
  }[] = [];
  FluxFinanciers: FluxFinancier[];
  context: 'LISTE' | 'EDIT' = 'LISTE';

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
  Sort(sens: 'NO' | 'ASC' | 'DESC', champ: string) {
    switch (champ) {
      case 'libelle':
        this.sort_libelle = sens;
        this.sort_date = 'NO';
        this.sort_sens = 'NO';
        this.sort_montant = 'NON';
        this.Operations.sort((a, b) => {
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
      case 'sens':
        this.sort_sens = sens;
        this.sort_libelle = 'NO';
        this.sort_date = 'NO';
        this.sort_montant = 'NO';
        this.Operations.sort((a, b) => {
          const lieuA = a.IsRecette;
          const lieuB = b.IsRecette;

          let comparaison = 0;
          if (lieuA > lieuB) {
            comparaison = 1;
          } else if (lieuA < lieuB) {
            comparaison = -1;
          }

          return this.sort_sens === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case 'date':
        this.sort_sens = 'NO';
        this.sort_date = sens;
        this.sort_libelle = 'NO';
        this.sort_montant = 'NO';
        this.Operations.sort((a, b) => {
          let dateA = new Date(a.Date);
          let dateB = new Date(b.Date);

          let comparaison = 0;
          if (dateA > dateB) {
            comparaison = 1;
          } else if (dateA < dateB) {
            comparaison = -1;
          }

          return this.sort_date === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case 'montant':
        this.sort_libelle = 'NO';
        this.sort_date = 'NO';
        this.sort_sens = 'NO';
        this.sort_montant = sens;
        this.Operations.sort((a, b) => {
          const soldeA = a.Solde; // Ignore la casse lors du tri
          const soldeB = b.Solde;
          let comparaison = 0;
          if (soldeA > soldeB) {
            comparaison = 1;
          } else if (soldeA < soldeB) {
            comparaison = -1;
          }

          return this.sort_montant === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
    }
  }
  ReinitFiltre() {
    this.filter_compte = null;
    this.filter_date_debut = null;
    this.filter_libelle = null;
    this.filter_montant_max = null;
    this.filter_montant_min = null;
    this.filter_sens_operation = null;
    this.filter_date_fin = null;
  }
  GotoFF(id: number) {
    this.router.navigate(['/comptabilite'], {
      queryParams: { context: 'FLUXFIN', id: id },
    });
  }
  onInputChange(displayText: string) {
    // Trouver l'objet complet correspondant à la valeur d'affichage
    const selectedOption = this.Destinataire.find(
      (option) => this.formatDestinataire(option) === displayText
    );
    if (selectedOption) {
      // Mettre à jour l'affichage et le modèle avec l'objet sélectionné
      this.editOperations.DestinataireLibelle = displayText;
      this.editOperations.Destinataire = selectedOption;
      this.editOperations.datasource.destinataire =
        JSON.stringify(selectedOption);
    } else {
      // Gérer les saisies libres si nécessaire
      this.editOperations.Destinataire = {
        id: 0,
        type: '',
        value: displayText,
      };
      this.editOperations.datasource.destinataire = JSON.stringify(
        this.editOperations.Destinataire
      );
    }
  }

  ExporterExcel() {}

  Save() {
    const errorService = ErrorService.instance;
    this.action = $localize`Mettre à jour une operation`;
    this.trns_serv
      .Update(this.editOperations.datasource)
      .then((ok) => {
        if (ok) {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
          this.VoirSituation();
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

  Edit(t: Operation) {
    let id = t.ID;
    const errorService = ErrorService.instance;
    this.action = $localize`Charger une operation`;
    this.trns_serv
      .Get(id)
      .then((tt) => {
        this.compta_serv
          .Get(tt.flux_financier_id)
          .then((ff) => {
            this.editOperations = new Operation(tt, ff.libelle);
            this.initializeDisplayValue();
            this.context = 'EDIT';
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
  initializeDisplayValue() {
    let currentDestinataire = null;
    try {
      currentDestinataire = JSON.parse(this.editOperations.Destinataire);
    } catch (error) {
    }
    // Vérification avec conversion pour s'assurer que les types sont identiques
    const matchingOption = this.Destinataire.find(
      (option) =>
        option.id === currentDestinataire?.id &&
        option.type === currentDestinataire?.type
    );

    if (matchingOption) {
      this.editOperations.DestinataireLibelle =
        this.formatDestinataire(matchingOption);
    } else {
      this.editOperations.DestinataireLibelle =
        currentDestinataire?.value || '';
    }
  }

  PrevueToExecute() {
    const errorService = ErrorService.instance;
    this.action = $localize`Mettre à jour les paiements`;

    // Récupère toutes les promesses de paiement
    const paymentPromises = this.Operations.filter(
      (t) => new Date(t.Date) < new Date() && t.StatutPaiement !== 1
    ).map((t) => this.Payer(t, true));

    // Exécute toutes les promesses et attend la fin de toutes
    Promise.all(paymentPromises)
      .then(() => {
        const successMessage = errorService.OKMessage(this.action);
        errorService.emitChange(successMessage);
      })
      .catch((err: HttpErrorResponse) => {
        const errorMessage = errorService.CreateError(this.action, err.message);
        errorService.emitChange(errorMessage);
      });
  }

  // La fonction Payer reste inchangée, sauf pour garantir qu'elle retourne une promesse
  Payer(t: Operation, multi: boolean = false): Promise<boolean> {
    t.StatutPaiement = 1;
    const errorService = ErrorService.instance;
    this.action = $localize`Mettre à jour le paiement`;

    return this.trns_serv
      .Update(t.datasource)
      .then((ok) => {
        if (ok) {
          if (!multi) {
            const o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.VoirSituation();
          }
          return true; // succès
        } else {
          const o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
          return false; // échec
        }
      })
      .catch((err: HttpErrorResponse) => {
        const o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        throw err; // relance l'erreur pour la gérer dans `PrevueToExecute`
      });
  }

  getCompte(id: number): CompteBancaire {
    return this.Comptes.find((x) => x.id == id);
  }
  formatDestinataire(destinataire: {
    id: number;
    type: 'stock' | 'rider' | 'lieu' | 'prof' | 'compte' | 'autre';
    value: string;
  }) {
    return `${destinataire.value} (${destinataire.type})`;
  }

  getFFMontant(id) {
    return this.FluxFinanciers.find((x) => x.ID == id).Montant;
  }
  VoirSituation() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la situation`;

    this.compta_serv.VoirSituation(this.saison_id).then((ff) => {
      this.Operations = [];
      this.FluxFinanciers = ff.map((x) => new FluxFinancier(x));
      this.FluxFinanciers.forEach((fluxf) => {
        fluxf.liste_operation.forEach((ttr) => {
          try {
            let lib_dest = JSON.parse(ttr.datasource.destinataire);
            ttr.DestinataireLibelle = lib_dest.value;
        } catch (error) {
            ttr.DestinataireLibelle = ''; // Définit une chaîne vide en cas d'erreur
        }
          this.Operations.push(ttr);
        });
      });
    });
  }
  Retour(){
    this.context = "LISTE";
    this.editOperations = null;
  }
}

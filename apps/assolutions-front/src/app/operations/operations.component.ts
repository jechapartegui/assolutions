import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AddInfoService } from '../../services/addinfo.service';
import { ComptabiliteService } from '../../services/comptabilite.service';
import { CompteBancaireService } from '../../services/compte-bancaire.service';
import { ErrorService } from '../../services/error.service';
import { OperationService } from '../../services/operation.service';
import { SaisonService } from '../../services/saison.service';
import { ClassComptable, StaticClass } from '../global';
import { Saison_VM } from '@shared/lib/saison.interface';
import { CompteBancaire_VM, FluxFinancier_VM, GenericLink_VM, Operation_VM } from '@shared/index';

@Component({
  standalone: false,
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
  Operations: Operation_VM[];
  editOperations: Operation_VM;
  ClassesComptable: ClassComptable[];
  Comptes: CompteBancaire_VM[];
  saison_id: number;
  saisons: Saison_VM[];
  sort_libelle: string = 'NO';
  sort_date: string = 'NO';
  sort_sens: string = 'NO';
  sort_montant: string = 'NO';
  action = '';
  Destinataire: GenericLink_VM[] = [];
  FluxFinanciers: FluxFinancier_VM[];
  context: 'LISTE' | 'EDIT' = 'LISTE';

  constructor(
    public compta_serv: ComptabiliteService,
    public trns_serv: OperationService,
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
          .getAll()
          .then((cpts) => {
            this.Comptes = cpts;
            this.action = $localize`Charger les classes comptables`;
            if (!this.SC.ClassComptable || this.SC.ClassComptable.length == 0) {
              this.addinfo_serv.get_lv('class_compta', false).then((liste) => {
                this.SC.ClassComptable = JSON.parse(liste.text);
                this.ClassesComptable = this.SC.ClassComptable;
              });
            } else {
              this.ClassesComptable = this.SC.ClassComptable;
            }
            this.VoirSituation();
            if (!this.SC.ListeObjet || this.SC.ListeObjet.length == 0) {
              let ad: string[] = ['rider', 'compte','prof'];
              this.addinfo_serv.getall_liste(ad).then((liste) => {
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
          const nomA = a.flux_financier.libelle.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.flux_financier.libelle.toUpperCase();
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
          const lieuA = a.solde < 0 ? false : true;
          const lieuB = b.solde < 0 ? false : true;

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
          let dateA = a.date_operation;
          let dateB = b.date_operation;

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
          const soldeA = a.solde; // Ignore la casse lors du tri
          const soldeB = b.solde;
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
  onInputChange(displayText: GenericLink_VM) {
    // Trouver l'objet complet correspondant à la valeur d'affichage
    const selectedOption = this.Destinataire.find(
      (option) => option === displayText
    );
    if (selectedOption) {
      // Mettre à jour l'affichage et le modèle avec l'objet sélectionné
      this.editOperations.destinataire = displayText;
    } else {
      // Gérer les saisies libres si nécessaire
      this.editOperations.destinataire = {
        id: 0,
        type: '',
        value: displayText.value,
      };
     
    }
  }

  ExporterExcel() {}

  Save() {
    const errorService = ErrorService.instance;
    this.action = $localize`Mettre à jour une operation`;
    this.trns_serv
      .update(this.editOperations)
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

  Edit(t: Operation_VM) {
    let id = t.id;
    const errorService = ErrorService.instance;
    this.action = $localize`Charger une operation`;
    this.trns_serv
      .get(id)
      .then((tt) => {
        this.compta_serv
          .get(tt.flux_financier_id)
          .then((ff) => {
            this.editOperations = tt;
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

  PrevueToExecute() {
    const errorService = ErrorService.instance;
    this.action = $localize`Mettre à jour les paiements`;

    // Récupère toutes les promesses de paiement
    const paymentPromises = this.Operations.filter(
      (t) => t.date_operation < new Date() && !t.paiement_execute
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
  Payer(t: Operation_VM, multi: boolean = false): Promise<boolean> {
    t.paiement_execute = true;
    const errorService = ErrorService.instance;
    this.action = $localize`Mettre à jour le paiement`;

    return this.trns_serv
      .update(t)
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

  getCompte(id: number): CompteBancaire_VM {
    return this.Comptes.find((x) => x.id == id);
  }
  formatDestinataire(destinataire: {
    id: number;
    type: string;
    value: string;
  }) {
    return `${destinataire.value} (${destinataire.type})`;
  }

  getFFMontant(id) {
    return this.FluxFinanciers.find((x) => x.id == id).montant;
  }
  VoirSituation() {
   
  }
  Retour(){
    this.context = "LISTE";
    this.editOperations = null;
  }
}

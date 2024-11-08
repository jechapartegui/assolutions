import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CompteBancaire } from 'src/class/comptebancaire';
import { fluxfinancier, FluxFinancier } from 'src/class/fluxfinancier';
import { KeyValuePair } from 'src/class/keyvaluepair';
import { saison } from 'src/class/saison';
import { stock } from 'src/class/stock';
import { transaction, Transaction } from 'src/class/transaction';
import { AddInfoService } from 'src/services/addinfo.service';
import { ComptabiliteService } from 'src/services/comptabilite.service';
import { CompteBancaireService } from 'src/services/compte-bancaire.service';
import { ErrorService } from 'src/services/error.service';
import { SaisonService } from 'src/services/saison.service';
import { TransactionService } from 'src/services/transaction.service';
import { StaticClass } from '../global';

@Component({
  selector: 'app-comptabilite',
  templateUrl: './comptabilite.component.html',
  styleUrls: ['./comptabilite.component.css'],
})
export class ComptabiliteComponent implements OnInit {
  afficher_filtre: boolean = false;
  afficher_filtre_ff: boolean = false;
  filter_compte: number = 0;
  filter_date_debut: Date;
  filter_date_fin: Date;
  filter_libelle: string;
  filter_date_debut_ff: Date;
  filter_date_fin_ff: Date;
  filter_libelle_ff: string;
  filter_classe_ff: number;
  filter_sens_transaction: boolean = null;
  filter_montant_min: number = 0;
  filter_montant_max: number;
  filter_montant_min_ff: number = 0;
  filter_montant_max_ff: number;
  saison_id: number;
  saisons: saison[];
  Transactions: Transaction[];
  editTransactions: Transaction;
  FluxFinanciers: FluxFinancier[];
  editFluxFlinancier: FluxFinancier;
  ClassesComptable:{numero:number,libelle:string }[];
  stocks: stock[];
  Comptes: CompteBancaire[];
  sort_libelle: string = 'NO';
  sort_date: string = 'NO';
  sort_sens: string = 'NO';
  sort_montant: string = 'NO';
  sort_libelle_ff: string = 'NO';
  sort_date_ff: string = 'NO';
  sort_montant_ff: string = 'NO';
  action = '';

  context: 'LISTE' | 'EDIT' | 'FLUXFIN' | 'COMPTA' | 'EDIT_FLUXFIN' = 'LISTE';

  constructor(
    public compta_serv: ComptabiliteService,
    public trns_serv: TransactionService,
    public saison_sev: SaisonService,
    public cb_serv:CompteBancaireService,
    public ai_serv:AddInfoService,
    public router: Router,
    public sc:StaticClass,
    public route:ActivatedRoute
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
        this.cb_serv.GetAll().then((cpts) =>{
          this.Comptes = cpts;
          this.action = $localize`Charger les classes comptables`;
          this.ai_serv.GetLV("COMPTE").then((lv) =>{
            this.ClassesComptable = this.sc.ClassComptable;
            this.VoirSituation();
          }).catch((err: HttpErrorResponse) => {
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
          });
        }).catch((err: HttpErrorResponse) => {
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
        this.Transactions.sort((a, b) => {
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
        this.Transactions.sort((a, b) => {
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
        this.Transactions.sort((a, b) => {
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
        this.Transactions.sort((a, b) => {
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
        this.sort_date_ff= sens;
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

  ReinitFiltre() {
    this.filter_compte = null;
    this.filter_date_debut = null;
    this.filter_libelle = null;
    this.filter_montant_max = null;
    this.filter_montant_min = null;
    this.filter_sens_transaction = null;
    this.filter_date_fin = null;
  }
  ExporterExcel() {}
  ReinitFiltre_ff() {
    this.filter_classe_ff = null;
    this.filter_date_debut_ff = null;
    this.filter_libelle_ff = null;
    this.filter_montant_max_ff = null;
    this.filter_montant_min_ff = null;
    this.filter_date_fin_ff = null;
  }
  ExporterExcel_ff() {}

  Payer(t: Transaction) {}
  
  Payer_ff(t: FluxFinancier) {}

  Save(){
    const errorService = ErrorService.instance;
    this.action = $localize`Mettre à jour une transaction`;
    this.trns_serv
      .Update(this.editTransactions.datasource)
      .then((ok) => {
        if(ok){
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
          this.VoirSituation();
        } else {
          let o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
        }
      }) .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }
  Save_ff(){
    const errorService = ErrorService.instance;
    this.action = $localize`Mettre à jour une flux`;
    if(this.editFluxFlinancier.ID == 0 ){
      this.compta_serv
      .Add(this.editFluxFlinancier.datasource)
      .then((id) => {
       this.editFluxFlinancier.ID = id;
       this.VoirSituation();
      }) .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
    } else {
      this.compta_serv
      .Update(this.editFluxFlinancier.datasource)
      .then((ok) => {
        if(ok){
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
          this.VoirSituation();
        } else {
          let o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
        }
      }) .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
    }
   
  }

  AjouterPaiement_ff(){
    let t = new transaction();
    let newValue = new Transaction(t, this.editFluxFlinancier.Libelle);
    newValue.Date = this.editFluxFlinancier.Date;
    newValue.LibelleDestinataire = this.editFluxFlinancier.LibelleDestinataire;
    let max_id = 1;
    let total = 0
    this.editFluxFlinancier.liste_transaction.forEach((f) =>{
      total += f.Solde;
      if(f.temp_id && f.temp_id>=max_id){
        max_id ++;
      }
    })
    newValue.Solde = this.editFluxFlinancier.Montant - total;
    newValue.IsRecette = this.editFluxFlinancier.IsRecette;
    newValue.StatutPaiement = 1;
    newValue.temp_id = max_id;
    this.editFluxFlinancier.liste_transaction.push(newValue);
  }

  Remove_liste(cpt:Transaction){
    if(cpt.ID > 0){
      this.editFluxFlinancier.liste_transaction = this.editFluxFlinancier.liste_transaction.filter(x => x.ID !== cpt.ID);
    } else {
      this.editFluxFlinancier.liste_transaction = this.editFluxFlinancier.liste_transaction.filter(x => x.temp_id !== cpt.temp_id);
    }
  }

  Edit(t: Transaction){
    let id = t.ID;
    const errorService = ErrorService.instance;
    this.action = $localize`Charger une transaction`;
    this.trns_serv
      .Get(id)
      .then((tt) => {
        this.compta_serv
          .Get(tt.flux_financier_id)
          .then((ff) => {
            this.editTransactions = new Transaction(tt, ff.libelle);
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
  Edit_ff(id: number) {
    this.context = 'EDIT_FLUXFIN';
    const errorService = ErrorService.instance;
    this.action = $localize`Charger une ligne comptable`;
    this.compta_serv
      .Get(id)
      .then((ff) => {
        this.editFluxFlinancier = new FluxFinancier(ff);
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }


  VoirSituation() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la situation`;

    this.compta_serv
      .VoirSituation(
        this.saison_id
      )
      .then((ff) => {
        this.Transactions = [];
        this.stocks = [];
        this.FluxFinanciers = ff.map((x) => new FluxFinancier(x));
        this.FluxFinanciers.forEach((fluxf) => {
          fluxf.liste_transaction.forEach((ttr) => {
            this.Transactions.push(ttr);
          });
        });
      });
  }
  Delete(t: Transaction) {}
  Read(t: Transaction) {}
  Delete_ff(ff: FluxFinancier) {}
  Read_ff(ff: FluxFinancier) {}
  GotoFF(id: number) {
    this.editFluxFlinancier = this.FluxFinanciers.find((x) => x.ID == id);
    this.context = 'FLUXFIN';
  }

  PrevueToExecute() {}
  Ajouter() {
    this.context = 'EDIT_FLUXFIN';
    let ff = new fluxfinancier();
    ff.date = new Date().toString();
    let tt = new transaction();
    tt.date_transaction = new Date().toString();
    ff.transactions.push(tt);
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

  BasculerVueCompta(){
    this.VoirSituation();
    this.context = "COMPTA";
  }
  BasculerVueTransaction(){
    this.VoirSituation();
    this.context = "LISTE";
  }
  getFFMontant(id ){
    return this.FluxFinanciers.find(x => x.ID == id).Montant;
  }
  
}

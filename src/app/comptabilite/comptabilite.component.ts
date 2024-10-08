import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CompteBancaire } from 'src/class/comptebancaire';
import { fluxfinancier, FluxFinancier } from 'src/class/fluxfinancier';
import { stock } from 'src/class/stock';
import { Transaction } from 'src/class/transaction';
import { ComptabiliteService } from 'src/services/comptabilite.service';
import { ErrorService } from 'src/services/error.service';
import { TransactionService } from 'src/services/transaction.service';

@Component({
  selector: 'app-comptabilite',
  templateUrl: './comptabilite.component.html',
  styleUrls: ['./comptabilite.component.css']
})
export class ComptabiliteComponent implements OnInit {

  afficher_filtre:boolean = false;
  filter_compte:number;
  filter_date_debut:Date;
  filter_date_fin:Date;
  filter_libelle:string;
  filter_sens_transaction:boolean= null;
  filter_montant_min:number = 0;
  filter_montant_max:number;
  nb_mois_avant_transactions:number = 6;
  nb_mois_apres_transactions:number = 2;
  Transactions:Transaction[];
  editTransactions:Transaction;
  FluxFinanciers:FluxFinancier[];
  editFluxFlinancier:FluxFinancier;
  stocks:stock[];
  Comptes:CompteBancaire[];
  sort_libelle:string = "NO";
  sort_date:string = "NO";
  sort_sens:string = "NO";
  sort_montant:string = "NO";
  action="";

  context: "LISTE" | "EDIT" | "FLUXFIN" | "COMPTA" | "EDIT_FLUXFIN" = "LISTE";

  constructor(public compta_serv:ComptabiliteService, public trns_serv:TransactionService, public router:Router){

  }
  ngOnInit(): void {
   this.VoirSituation();   
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

  ReinitFiltre(){
    this.filter_compte = null;
    this.filter_date_debut = null;
    this.filter_libelle = null;
    this.filter_montant_max = null;
    this.filter_montant_min = null;
    this.filter_sens_transaction = null;
    this.filter_date_fin = null;
  }
  ExporterExcel(){

  }
  
  Payer(t:Transaction){

  }
  Edit(id:number){
    const errorService = ErrorService.instance;
    this.action = $localize`Charger une transaction`;
    this.trns_serv.Get(id).then((tt) =>{
      this.compta_serv.Get(tt.flux_financier_id).then((ff) =>{
        this.editTransactions = new Transaction(tt,ff.libelle);
        this.context = "EDIT";
      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    });

  }

  EditFF(id:number){

  }

  VoirSituation(){
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la situation`;
    this.compta_serv.VoirSituation(this.nb_mois_avant_transactions, this.nb_mois_apres_transactions).then((ff) =>{
      this.Transactions = [];
      this.stocks = [];
      this.FluxFinanciers = ff.map(x => new FluxFinancier(x));
      this.FluxFinanciers.forEach((fluxf) =>{
        fluxf.liste_transaction.forEach((ttr) =>{
          this.Transactions.push(ttr);
        })
      })

    })
  }
  Delete(t:Transaction){
    
  }
  Read(t:Transaction){
    
  }
  GotoFF(id:number){
    this.editFluxFlinancier = this.FluxFinanciers.find(x => x.ID == id);
    this.context = "FLUXFIN";
  }

  PrevueToExecute(){

  }
  Ajouter(){
    this.context = "EDIT_FLUXFIN";
    let ff = new fluxfinancier();
    this.editFluxFlinancier = new FluxFinancier(ff);
  }

  getCompte(id:number):CompteBancaire{
    return this.Comptes.find(x => x.id == id);

  }

  GoToType(id:number, type_:string){
    switch(type_){
      case "rider":
        this.router.navigate(['/adherent'], { queryParams: { id: id }} );
        break;
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdherentService } from '../../services/adherent.service';
// import { ErrorService } from '../../services/error.service';
import { SeancesService } from '../../services/seance.service';
import { GlobalService } from '../../services/global.services';
import { Compte_VM } from '@shared/lib/compte.interface';
import { CompteService } from '../../services/compte.service';
import { Personne_VM } from '@shared/lib/personne.interface';
import { ErrorService } from '../../services/error.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Adherent_VM } from '@shared/lib/member.interface';
import { InscriptionSeanceService } from '../../services/inscription-seance.service';
import { MailService } from '../../services/mail.service';

@Component({
  standalone: false,
  selector: 'app-seances-essais',
  templateUrl: './seances-essais.component.html',
  styleUrls: ['./seances-essais.component.css']
})
export class SeancesEssaisComponent implements OnInit {
  public context : "compte" | "personne" | "validation" = "compte"
  public id_seance:number;
  public action:string;
  public thisAccount:Compte_VM;
  public ListePersonne:Personne_VM[] = [];
  public personne:Personne_VM = null;
  public edit_personne:boolean = false;
  constructor(public GlobalServices:GlobalService, public mail_serv:MailService, public inscription_seance:InscriptionSeanceService, public route: ActivatedRoute, public sean_serv: SeancesService, public rider_serv: AdherentService, public compteserv:CompteService) {

  }
  ngOnInit(): void {
    //const errorService = ErrorService.instance;
    this.route.queryParams.subscribe(params => {
      if ('id' in params) {
        this.id_seance = params['id'];
        this.action = $localize`Faire un essai`;
        this.context = "compte";
        return;
      } 
    })
  }
  async gererCompte(cvm:Compte_VM){
    if(cvm){
    this.thisAccount = cvm;
    this.context = "personne";
    if(cvm.id == 0) {

    } else {
     this.ListePersonne = await this.rider_serv.GetAllPersonne(cvm.id);
    }
    }

  }
  async Valider(){
    let c = window.confirm($localize`Confirmez-vous l'inscription à la séance d'essai ` );
    if(c){
      const errorService = ErrorService.instance;
      this.action = $localize`Inscription à l'essai`;
      let id_personne = this.personne.id;
       if(!this.thisAccount){
               let o = errorService.CreateError(this.action, $localize`Aucun compte sélectionné`);
               errorService.emitChange(o);
               return;
           } else {
             if(this.thisAccount.id == 0) {
               await   this.compteserv.Add(this.thisAccount).then((id) =>{
                 this.thisAccount.id = id;
               this.personne.compte = id; }).catch((err: HttpErrorResponse) => {
               let o = errorService.CreateError(this.action, err.message);
               errorService.emitChange(o);
             });
               }
             }
             if(this.personne.id == 0) {
              const adh = Object.assign(new Adherent_VM(),this.personne);
          await this.rider_serv
             .Add(adh)
             .then((id) => {
               adh.id = id;
               id_personne = id;
               let o = errorService.OKMessage(this.action);
               errorService.emitChange(o);
             })
             .catch((err: HttpErrorResponse) => {
               let o = errorService.CreateError(this.action, err.message);
               errorService.emitChange(o);
             });
         }
         this.inscription_seance.FaireEssai(id_personne, this.id_seance).then(async (id) =>{
          if(id && id>0){
              await this.mail_serv.EnvoiMailEssai(id_personne, this.id_seance);
               let o = errorService.OKMessage(this.action);
               errorService.emitChange(o);
          } else {
               let o = errorService.UnknownError(this.action);
               errorService.emitChange(o);
          }

         }).catch((err: HttpErrorResponse) => {
               let o = errorService.CreateError(this.action, err.message);
               errorService.emitChange(o);
             });
    }
  }
  addPersonne(personne:Personne_VM){
    if(this.personne){
      this.personne = personne;
    } else {
    this.ListePersonne.push(personne);
    this.personne = personne;
    }
    this.edit_personne = false;
  }
}

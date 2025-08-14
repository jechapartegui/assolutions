import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdherentService } from '../../services/adherent.service';
// import { ErrorService } from '../../services/error.service';
import { SeancesService } from '../../services/seance.service';
import { GlobalService } from '../../services/global.services';
import { Compte_VM } from '@shared/src/lib/compte.interface';
import { CompteService } from '../../services/compte.service';
import { Personne_VM } from '@shared/src/lib/personne.interface';

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
  public Account:Compte_VM;
  public ListePersonne:Personne_VM[] = [];
  public Personne:Personne_VM = null;
  public edit_personne:boolean = false;
  constructor(public GlobalServices:GlobalService, public route: ActivatedRoute, public sean_serv: SeancesService, public rider_serv: AdherentService, public compteserv:CompteService) {

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
    this.Account = cvm;
    this.context = "personne";
    if(cvm.id == 0) {

    } else {
     this.ListePersonne = await this.rider_serv.GetAllPersonne(cvm.id);
      console.log(this.ListePersonne);
    }
    }

  }
  Valider(){
    let c = window.confirm($localize`Confirmez-vous l'inscription à la séance d'essai ` );
    if(c){

    }
  }
  addPersonne(personne:Personne_VM){
    console.log(personne);
    if(this.Personne){
      this.Personne = personne;
    } else {
    this.ListePersonne.push(personne);
    this.Personne = personne;
    }
    this.edit_personne = false;
  }
}

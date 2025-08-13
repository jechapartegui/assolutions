import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdherentService } from '../../services/adherent.service';
// import { ErrorService } from '../../services/error.service';
import { InscriptionSeanceService } from '../../services/inscription-seance.service';
import { MailService } from '../../services/mail.service';
import { ProfesseurService } from '../../services/professeur.service';
import { SeancesService } from '../../services/seance.service';
import { LieuNestService } from '../../services/lieu.nest.service';
import { GlobalService } from '../../services/global.services';

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
  constructor(public GlobalServices:GlobalService, public insc_sean_serv:InscriptionSeanceService, public mail_serv:MailService, public route: ActivatedRoute, public sean_serv: SeancesService, public rider_serv: AdherentService, public prof_serv: ProfesseurService, public lieuserv: LieuNestService) {

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
}

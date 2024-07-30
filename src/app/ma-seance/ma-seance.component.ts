import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Adherent, adherent } from 'src/class/adherent';
import { inscription_seance } from 'src/class/inscription';
import { seance } from 'src/class/seance';
import { AdherentService } from 'src/services/adherent.service';
import { ErrorService } from 'src/services/error.service';
import { InscriptionSeanceService } from 'src/services/inscription-seance.service';
import { SeancesService } from 'src/services/seance.service';

@Component({
  selector: 'app-ma-seance',
  templateUrl: './ma-seance.component.html',
  styleUrls: ['./ma-seance.component.css']
})
export class MaSeanceComponent implements OnInit {
  @Input() id: number = 0;
  thisSeance: seance;
  liste_adherent: Adherent[];
  adherent_to: Adherent;
  action: string;
  liste_inscription: inscription_seance[];
  constructor(private adhserv: AdherentService, private seanceserv: SeancesService, private router: Router, private route: ActivatedRoute, private inscriptionserv:InscriptionSeanceService) {

  }
  ngOnInit(): void {
    if (this.id == 0) {
      this.route.queryParams.subscribe(params => {
        if ('id' in params) {
          this.id = params['id'];
        } else {
          this.router.navigate(['/menu']);
        }
      })
    }
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la séance`;
    this.adhserv.GetAllThisSeason().then((riders) => {
      this.liste_adherent = riders.map(x => new Adherent(x));
      this.seanceserv.Get(this.id).then((ss) => {
        this.thisSeance = ss;
        this.inscriptionserv.GetAllSeance(this.id).then((insc) =>{
          this.liste_inscription = insc;
        }).catch((error) => {
          let n = errorService.CreateError(this.action, error);
          errorService.emitChange(n);
        });
      }).catch((error) => {
        let n = errorService.CreateError(this.action, error);
        errorService.emitChange(n);
      });
    }).catch((error) => {
      let n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
    });
  }
}

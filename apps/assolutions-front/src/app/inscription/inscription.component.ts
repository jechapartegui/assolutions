import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ErrorService } from '../../services/error.service';
import { InscriptionSaisonService } from '../../services/inscription-saison.service';
import { SaisonService } from '../../services/saison.service';
import { Saison_VM } from '@shared/lib/saison.interface';
import { Adherent_VM } from '@shared/lib/member.interface';
import { InscriptionSaison_VM } from '@shared/lib/inscription_saison.interface';
import { AppStore } from '../app.store';


@Component({
  standalone: false,
  selector: 'app-inscription',
  templateUrl: './inscription.component.html',
  styleUrls: ['./inscription.component.css'],
})
export class InscriptionComponent implements OnInit {
  @Input() thisAdherent: Adherent_VM;
  @Input() thisSaison: number;
    @Output() Fermer = new EventEmitter<boolean>();
  inclurePaiement: boolean = true;
  public saisons: Saison_VM[] = [];
  public action: string;

  constructor(private saisonService: SaisonService, public inscription:InscriptionSaisonService, public store:AppStore) {}

  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les saisons`;
    this.saisonService
      .GetAll()
      .then((saison) => {
        this.saisons = saison;
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }

  onSaisonChange($event) {
    console.log($event);
  }

  Adherer() {
    const errorService = ErrorService.instance;
    this.action = $localize`Adhérer`;
     const iss = new InscriptionSaison_VM();
        iss.rider_id = this.thisAdherent.id;
        iss.active = true;
        iss.saison_id = this.store.saison_active_id();
    this.inscription.Add(iss).then((result) => {  
      let o = errorService.OKMessage(this.action);
      errorService.emitChange(o);
      this.close(true);
    })
    .catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    });
  }

  close(boo:boolean = false) {
    console.log(boo);
    this.Fermer.emit(boo);
  }
}

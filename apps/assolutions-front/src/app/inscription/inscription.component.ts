import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ErrorService } from '../../services/error.service';
import { InscriptionSaisonService } from '../../services/inscription-saison.service';
import { SaisonService } from '../../services/saison.service';
import { Saison_VM } from '@shared/src/lib/saison.interface';
import { Adherent_VM } from '@shared/src/lib/member.interface';


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

  constructor(private saisonService: SaisonService, public inscription:InscriptionSaisonService) {}

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
    this.inscription.Add(this.thisSaison,this.thisAdherent.id).then((result) => {  
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

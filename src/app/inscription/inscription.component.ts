import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Adherent } from 'src/class/adherent';
import { ErrorService } from 'src/services/error.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Saison } from 'src/class/saison';
import { SaisonService } from 'src/services/saison.service';
import { InscriptionSaisonService } from 'src/services/inscription-saison.service';

@Component({
  selector: 'app-inscription',
  templateUrl: './inscription.component.html',
  styleUrls: ['./inscription.component.css'],
})
export class InscriptionComponent implements OnInit {
  @Input() thisAdherent: Adherent;
  @Input() thisSaison: number;
    @Output() Fermer = new EventEmitter<boolean>();
  inclurePaiement: boolean = true;
  public saisons: Saison[] = [];
  public action: string;

  constructor(private saisonService: SaisonService, public inscription:InscriptionSaisonService) {}

  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les saisons`;
    this.saisonService
      .GetAll()
      .then((saison) => {
        this.saisons = saison.map((s) => new Saison(s));
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
    this.inscription.Add(this.thisSaison,this.thisAdherent.ID).then((result) => {  
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

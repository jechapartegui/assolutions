import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import {
  InscriptionSeance_VM,
  InscriptionStatus_VM,
} from '@shared/lib/inscription_seance.interface';
import { MailService } from '../../services/mail.service';
import { Seance_VM } from '@shared/index';
import { AppStore } from '../app.store';

@Component({
  standalone: false,
  selector: 'app-seances-essais',
  templateUrl: './seances-essais.component.html',
  styleUrls: ['./seances-essais.component.css'],
})
export class SeancesEssaisComponent implements OnInit {
  public context: 'compte' | 'personne' | 'validation' = 'compte';
  public id_seance: number;
  public action: string;
  public thisAccount: Compte_VM;
  public thisSeance: Seance_VM;
  public ListePersonne: Personne_VM[] = [];
  public personne: Personne_VM = null;
  public edit_personne: boolean = false;
  constructor(
    public GlobalServices: GlobalService,
    public mail_serv: MailService,
    public inscription_seance: InscriptionSeanceService,
    public route: ActivatedRoute,
    public router: Router,
    public sean_serv: SeancesService,
    public rider_serv: AdherentService,
    public compteserv: CompteService,
    public store:AppStore
  ) {}
  ngOnInit(): void {
    //const errorService = ErrorService.instance;
      const errorService = ErrorService.instance;
      this.action = $localize`Inscription à l'essai`;
    if(!this.store.hasProjet()){
       let o = errorService.CreateError(this.action, $localize`Vous n'êtes pas connecté à un club, veuillez repartir de la liste des séances`);
                  errorService.emitChange(o);
                  
    }
    this.route.queryParams.subscribe((params) => {
      if ('id' in params) {
        this.id_seance = params['id'];
        this.sean_serv.Get(this.id_seance).then((s) => {
          this.thisSeance = s;
        });
        this.action = $localize`Faire un essai`;
        this.context = 'compte';
        return;
      }
    });
  }
  async gererCompte(cvm: Compte_VM) {
    if (cvm) {
      this.thisAccount = cvm;
      this.context = 'personne';
      if (cvm.id == 0) {
      } else {
        this.ListePersonne = await this.rider_serv.GetAllPersonne(cvm.id);
        if (this.ListePersonne && this.ListePersonne.length == 1) {
          this.personne = this.ListePersonne[0];
          this.edit_personne = false;
        } else {
          this.personne = null;
        }
      }
    }
  }
  async Valider() {
    let c = window.confirm(
      $localize`Confirmez-vous l'inscription à la séance d'essai `
    );
    if (c) {
      const errorService = ErrorService.instance;
      this.action = $localize`Inscription à l'essai`;
      let id_personne = this.personne.id;
      if (!this.thisAccount) {
        let o = errorService.CreateError(
          this.action,
          $localize`Aucun compte sélectionné`
        );
        errorService.emitChange(o);
        return;
      } else {
        if (this.thisAccount.id == 0) {
          await this.compteserv
            .Add(this.thisAccount)
            .then(async (id) => {
              this.thisAccount.id = id;
              this.personne.compte = id;
              await this.mail_serv
                .MailActivation(this.thisAccount.email)
                .then(() => {
                  let o = errorService.OKMessage(this.action);
                  errorService.emitChange(o);
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
          if (this.personne.id == 0) {
            const adh = Object.assign(new Adherent_VM(), this.personne);
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
          let i = new InscriptionSeance_VM();
          i.date_inscription = new Date();
          i.statut_inscription = InscriptionStatus_VM.ESSAI;
          i.statut_seance = null;
          i.rider_id = id_personne;
          i.seance_id = this.id_seance;
          
          this.inscription_seance
            .MAJ(i)
            .then(async (_OK) => {
              if (_OK) {
                await this.mail_serv.EnvoiMailEssai(
                  id_personne,
                  this.id_seance
                );
                let o = errorService.OKMessage(this.action);
                errorService.emitChange(o);
                  this.router.navigate(['/login']);
              } else {
                let o = errorService.UnknownError(this.action);
                errorService.emitChange(o);
              }
            })
            .catch((err: HttpErrorResponse) => {
              let o = errorService.CreateError(this.action, err.message);
              errorService.emitChange(o);
            });
        } else {
          if (this.personne.id == 0) {
            const adh = Object.assign(new Adherent_VM(), this.personne);
            adh.compte = this.thisAccount.id;
            await this.rider_serv
              .Add(adh)
              .then((id) => {
                adh.id = id;
                id_personne = id;
                let o = errorService.OKMessage(this.action);
                errorService.emitChange(o);
                          let i = new InscriptionSeance_VM();
          i.date_inscription = new Date();
          i.statut_inscription = InscriptionStatus_VM.ESSAI;
          i.statut_seance = null;
          i.rider_id = id_personne;
          i.seance_id = this.id_seance;
          this.inscription_seance
            .MAJ(i)
           .then(async (_OK) => {
              if (_OK) {
                await this.mail_serv.EnvoiMailEssai(
                  id_personne,
                  this.id_seance
                );
                let o = errorService.OKMessage(this.action);
                errorService.emitChange(o);
                  this.router.navigate(['/liste-seances-public?id=' + this.store.selectedProject().id]);
              } else {
                let o = errorService.UnknownError(this.action);
                errorService.emitChange(o);
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

        }
      }
    }
  }

  isLP0(): boolean {
    try {
      return !this.ListePersonne.find((x) => x.id == 0);
    } catch (error) {
      return true;
    }
  }

  async addPersonne(_p: Personne_VM) {
    if (_p) {
      this.personne = _p;
      this.ListePersonne.push(_p);
    }
    this.edit_personne = false;
  }
}

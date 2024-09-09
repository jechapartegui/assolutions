import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Adherent, adherent } from 'src/class/adherent';
import { inscription_seance, InscriptionMaSeance, StatutPresence } from 'src/class/inscription';
import { seance, StatutSeance } from 'src/class/seance';
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
  afficher_admin: boolean = false;
  Autres: InscriptionMaSeance[] = [];
  Inscrits: InscriptionMaSeance[] = [];
  Potentiels: InscriptionMaSeance[] = [];
  All: InscriptionMaSeance[] = [];
  Absents: InscriptionMaSeance[] = [];
  Presents: InscriptionMaSeance[] = [];
  adherent_to: InscriptionMaSeance;
  action: string;
  constructor(private adhserv: AdherentService, private seanceserv: SeancesService, private router: Router, private route: ActivatedRoute, private inscriptionserv: InscriptionSeanceService) {

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
    this.seanceserv.Get(this.id).then((ss) => {
      this.thisSeance = ss;
      this.inscriptionserv.GetAllSeance(this.id).then((res) => {
        this.Autres = res.autres.map(x => new InscriptionMaSeance(x));
        this.Inscrits = res.inscrits.map(x => new InscriptionMaSeance(x));
        this.Potentiels = res.potentiels.map(x => new InscriptionMaSeance(x));
        this.All = this.Inscrits.concat(this.Potentiels);
        this.Absents = res.absents.map(x => new InscriptionMaSeance(x));
        this.Presents = res.presents.map(x => new InscriptionMaSeance(x));
      }).catch((error) => {
        let n = errorService.CreateError(this.action, error);
        errorService.emitChange(n);
      });
    }).catch((error) => {
      let n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
    });

  }


  MAJInscription(inscription: InscriptionMaSeance, statut: boolean) {
    const errorService = ErrorService.instance;
    let oldstatut = inscription.StatutSeance;
    let libelleseab = this.thisSeance.libelle;
    if (statut) {
      inscription.StatutSeance = StatutPresence.Présent;
      this.action = inscription.Libelle + $localize` est présent à la séance ` + libelleseab;
    } else {
      inscription.StatutSeance = StatutPresence.Absent;
      this.action = inscription.Libelle + $localize` est absent à la séance ` + libelleseab;
    }
    if (inscription.ID == 0) {

      this.inscriptionserv.Add(inscription.datasource).then((id) => {
        inscription.ID = id;
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
        this.inscriptionserv.Get(id).then((ins) => {
          this.All = this.All.filter(x => x.RiderID !== inscription.RiderID);
          inscription = new InscriptionMaSeance(ins);
          if (statut) {
            this.Presents.push(inscription);
          } else {
            this.Absents.push(inscription);
          }
        })

      }).catch((err: HttpErrorResponse) => {
        inscription.StatutSeance = oldstatut
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      })
    } else {
      this.inscriptionserv.Update(inscription.datasource).then((retour) => {
        if (retour) {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
          this.inscriptionserv.Get(inscription.ID).then((ins) => {
            this.All = this.All.filter(x => x.RiderID !== inscription.RiderID);
            inscription = new InscriptionMaSeance(ins);
            if (statut) {
              this.Presents.push(inscription);
            } else {
              this.Absents.push(inscription);
            }
          })
        } else {
          let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
          errorService.emitChange(o);
        }

      }).catch((err: HttpErrorResponse) => {
        inscription.StatutSeance = oldstatut
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      })
    }
  }
  contact_urgence(ins: InscriptionMaSeance): string {
    if (ins.ContactsUrgence.length == 0) {
      return ins.Contacts.find(x => x.Type == "PHONE").Value;
    }
    try {
      return ins.ContactsUrgence.find(x => x.Type == "PHONE").Value;
    } catch {

      return ins.Contacts.find(x => x.Type == "PHONE").Value;
    }
  }
  contact_urgence_nom(ins: InscriptionMaSeance): string {
    let retour = "";
    if (ins.ContactsUrgence.length == 0) {
      retour = ins.Contacts.find(x => x.Type == "PHONE").Notes;
    }
    try {
      retour = ins.ContactsUrgence.find(x => x.Type == "PHONE").Notes;
    } catch {


    }
    return retour;
  }
  AjouterAdherentsHorsGroupe() {
    const errorService = ErrorService.instance;
    if (this.adherent_to) {
      this.action = $localize`Convoquer ` + this.adherent_to.Libelle;
      this.adherent_to.SeanceID = this.thisSeance.seance_id;
      this.adherent_to.StatutInscription = StatutPresence.Convoqué;
      this.adherent_to.StatutSeance = null;
      this.inscriptionserv.Add(this.adherent_to.datasource).then((id) => {
        this.adherent_to.ID = id;
        this.inscriptionserv.Get(id).then((ins) => {
          let inscription = new InscriptionMaSeance(ins);
          this.All.push(inscription);
          this.Autres = this.Autres.filter(x => x.RiderID !== inscription.RiderID);
          this.adherent_to = null;
        });
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);

      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      })
    }

  }

  GetNbPersonne(liste: InscriptionMaSeance[]): boolean {
    if (this.thisSeance.est_place_maximum) {
      let ct = liste.filter(x => x.StatutSeance == StatutPresence.Présent).length;
      if (ct >= this.thisSeance.place_maximum) {
        return false;
      } else {
        return true;
      }
    } else {
      return true;
    }
  }
  ChangerStatut(statut: string) {
    const errorService = ErrorService.instance;
    switch (statut) {
      case 'réalisée':
        this.action = $localize`Terminer la séance`;

        break;
      case 'prévue':
        this.action = $localize`Planifier la séance`;
        break;
      case 'annulée':
        this.action = $localize`Annuler la séance`;
        break;
    }
    this.seanceserv.MAJStatutSeance(this.thisSeance.seance_id, statut).then((retour) => {
      if (retour) {
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
        if(statut == "annulée"){
          this.thisSeance.statut = StatutSeance.annulée;
          let confirm_mess = window.confirm($localize`Voulez-vous envoyer un email à l'ensemble des participants potentiels de cette séance pour les prévenir de l'annulation ?`);
          if(confirm_mess){
            window.alert("Fontion non diposnible");
          }
        } else {
          this.thisSeance.statut = StatutSeance.réalisée;
        }
      } else {
        let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
        errorService.emitChange(o);
      }
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    })
  }
  Save() {
    const errorService = ErrorService.instance;
    this.action = $localize`Sauvegarder la séance`;
    this.seanceserv.Update(this.thisSeance).then((retour: boolean) => {
      if (retour) {
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      } else {
        let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
        errorService.emitChange(o);
      }
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    })
  }
}

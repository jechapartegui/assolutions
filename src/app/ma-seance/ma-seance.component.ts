import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Adherent, adherent } from 'src/class/adherent';
import { inscription_seance, StatutPresence } from 'src/class/inscription';
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
  AdherentsHorsGroupe: Adherent[] = [];
  adherent_to: Adherent;
  action: string;
  liste_inscription: inscription_seance[];
  liste_essai: Adherent[] = [];
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
      this.adhserv.GetAllSeason(ss.saison_id).then((riders) => {
        this.liste_adherent = riders.map(x => new Adherent(x));
        this.inscriptionserv.GetAllSeance(this.id).then((insc) => {
          this.liste_inscription = insc;
          if (!this.liste_inscription) {
            this.liste_inscription = [];
          }
          this.UpdateListe();
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

  UpdateListe() {
    this.action = $localize`Charger la séance`;
    const errorService = ErrorService.instance;
    this.AdherentsHorsGroupe = [];
    this.liste_adherent.forEach((adh) => {
      let cpt = this.liste_inscription.filter(x => x.rider_id == adh.ID).length;
      if (cpt == 0) {
        // non inscrit mais potentiel ?
        if (this.thisSeance.convocation_nominative) {
          this.AdherentsHorsGroupe.push(adh);
        } else {
          let cptgr = 0;
          adh.Groupes.forEach((gr) => {
            if (this.thisSeance.groupes.filter(x => gr.id == x.id).length > 0) {
              let okadhrent: boolean = true;
              if (this.thisSeance.est_limite_age_maximum) {
                if (this.thisSeance.age_maximum <= this.calculateAge(new Date(adh.DDN))) {
                  okadhrent = false;
                }
              }
              if (this.thisSeance.est_limite_age_minimum && okadhrent) {
                if (this.thisSeance.age_minimum >= this.calculateAge(new Date(adh.DDN))) {
                  okadhrent = false;
                }
              }
              if (okadhrent) {
                cptgr = cptgr + 1;
              }
            }
          })

          if (cptgr > 0) {
            let inscr_new: inscription_seance = new inscription_seance();
            inscr_new.id = 0;
            inscr_new.rider_id = adh.ID;
            inscr_new.seance_id = this.thisSeance.seance_id;
            inscr_new.statut_inscription = null;
            inscr_new.statut_seance = null;

            this.liste_inscription.push(inscr_new);
          } else {
            this.AdherentsHorsGroupe.push(adh);
          }
        }
      }
    })
    this.liste_inscription.filter(x => x.statut_inscription == StatutPresence.Essai).forEach((ess) => {
      this.adhserv.Get_Essai(ess.rider_id).then((adh) => {
        this.liste_essai.push(new Adherent(adh));
      }).catch((error) => {
        let n = errorService.CreateError(this.action, error);
        errorService.emitChange(n);
      });
    })
  }

  trouverRider(id: Number) {
    let i = this.liste_adherent.find(x => x.ID == id);
    if (i) {
      return i.Libelle;
    } else {
      return this.liste_essai.find(x => x.ID == id).Libelle;
    }
  }
  trouverContactUrgence(id: Number) {
    let i = this.liste_adherent.find(x => x.ID == id);
    if (i) {
      if (this.liste_adherent.find(x => x.ID == id).ContactsUrgence.length == 0) {
        return this.liste_adherent.find(x => x.ID == id).Contacts.find(x => x.Type = "PHONE").Value;
      }
      try {
        return this.liste_adherent.find(x => x.ID == id).ContactsUrgence.find(x => x.Type = 'PHONE').Value
      } catch {

        return this.liste_adherent.find(x => x.ID == id).ContactsUrgence[0].Value;
      }
    } else {
      if (this.liste_essai.find(x => x.ID == id).ContactsUrgence.length == 0) {
        return this.liste_essai.find(x => x.ID == id).Contacts.find(x => x.Type = "PHONE").Value;
      }
      try {
        return this.liste_essai.find(x => x.ID == id).ContactsUrgence.find(x => x.Type = 'PHONE').Value
      } catch {

        return this.liste_essai.find(x => x.ID == id).ContactsUrgence[0].Value;
      }
    }

  }
  calculateAge(dateNaissance: Date): number {
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
  MAJInscription(inscription: inscription_seance, statut: boolean) {
    const errorService = ErrorService.instance;
    let oldstatut = inscription.statut_inscription;
    let libellenom = this.liste_adherent.find(x => x.ID == inscription.rider_id).Libelle;
    let libelleseab = this.thisSeance.libelle;
    if (statut) {
      inscription.statut_seance = StatutPresence.Présent;
      this.action = libellenom + $localize` est présent à la séance ` + libelleseab;
    } else {
      inscription.statut_seance = StatutPresence.Absent;
      this.action = libellenom + $localize` est absent à la séance ` + libelleseab;
    }
    if (inscription.id == 0) {

      this.inscriptionserv.Add(inscription).then((id) => {
        inscription.id = id;
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
        this.inscriptionserv.Get(id).then((ins) => {
          inscription = ins;
        })

      }).catch((err: HttpErrorResponse) => {
        inscription.statut_inscription = oldstatut
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      })
    } else {
      this.inscriptionserv.Update(inscription).then((retour) => {
        if (retour) {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
          this.inscriptionserv.Get(inscription.id).then((ins) => {
            inscription = ins;
          })
        } else {
          let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
          errorService.emitChange(o);
        }

      }).catch((err: HttpErrorResponse) => {
        inscription.statut_inscription = oldstatut
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      })
    }
  }
  AjouterAdherentsHorsGroupe() {
    const errorService = ErrorService.instance;
    if (this.adherent_to) {
      console.log(this.adherent_to);
      this.action = $localize`Convoquer ` + this.adherent_to.Libelle;
      let inscr_new: inscription_seance = new inscription_seance();
      inscr_new.id = 0;
      inscr_new.rider_id = this.adherent_to.ID;
      inscr_new.seance_id = this.thisSeance.seance_id;
      inscr_new.statut_inscription = StatutPresence.Convoqué;
      inscr_new.statut_seance = null;
      this.inscriptionserv.Add(inscr_new).then((id) => {
        inscr_new.id = id;
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);

        this.liste_inscription.push(inscr_new);

      }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      })
    }

  }

  GetNbPersonne(): boolean {
    if (this.thisSeance.est_place_maximum) {
      let ct = this.liste_inscription.filter(x => x.statut_seance == StatutPresence.Présent).length;
      if (ct >= this.thisSeance.place_maximum) {
        return false;
      } else {
        return true;
      }
    } else {
      return true;
    }
  }
}

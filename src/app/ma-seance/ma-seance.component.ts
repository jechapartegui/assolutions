import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InscriptionMaSeance, StatutPresence } from 'src/class/inscription';
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
  @ViewChild('scrollableContent', { static: false })
    scrollableContent!: ElementRef;
    showScrollToTop: boolean = false;
    display_personne:boolean = true;
    display_absent:boolean = true;
    add_adh_seance:boolean = false;
    display_present:boolean = true;
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
  seanceText: string;
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
      this.generateSeanceText();
      this.Load();
    }).catch((error) => {
      let n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
    });

  }
  setStatus(statut, inscription) {
    inscription.isVisible = false;
    const errorService = ErrorService.instance;
    let oldstatut = inscription.StatutInscription;
    let libelleseab = this.thisSeance.libelle;
    switch (statut) {
      default:
        this.action = inscription.Libelle + $localize` a un statut inconnu pour la séance ` + libelleseab;
        inscription.StatutInscription = null;
        break;
      case 'présent':
        this.action = inscription.Libelle + $localize` devrait être présent à la séance ` + libelleseab;
        inscription.StatutInscription = StatutPresence.Présent;
        break;
      case 'essai':
        this.action = inscription.Libelle + $localize` est à l'essai pour la séance ` + libelleseab;
        inscription.StatutInscription = StatutPresence.Essai;
        break;
      case 'absent':
        this.action = inscription.Libelle + $localize` devrait être absent à la séance ` + libelleseab;
        inscription.StatutInscription = StatutPresence.Absent;
        break;
      case 'convoqué':
        this.action = inscription.Libelle + $localize` devrait être présent à la séance ` + libelleseab;
        inscription.StatutInscription = StatutPresence.Convoqué;
        break;

    }

    if (inscription.ID == 0) {

      this.inscriptionserv.Add(inscription.datasource).then((id) => {
        inscription.ID = id;
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
        this.Load();

      }).catch((err: HttpErrorResponse) => {
        inscription.StatutInscription = oldstatut
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      })
    } else {
      this.inscriptionserv.Update(inscription.datasource).then((retour) => {
        if (retour) {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
          this.Load();
        } else {
          inscription.StatutInscription = oldstatut
          let o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
        }

      }).catch((err: HttpErrorResponse) => {
        inscription.StatutInscription = oldstatut
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      })
    }
  }

  RetourListe(){
    this.router.navigate(['/seance']);
  }

  Load() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la séance`;
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
  }
  private generateSeanceText() {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const ddb = new Date(this.thisSeance.date_seance);
    const dateDebStr = ddb.toLocaleDateString('fr-FR', options);
    this.seanceText = ` ${dateDebStr}`;
  }

  MAJInscription(inscription: InscriptionMaSeance, statut: boolean) {

    const errorService = ErrorService.instance;
    let oldstatut = inscription.StatutSeance;
    let libelleseab = this.thisSeance.libelle;
    if (statut == true) {
      inscription.StatutSeance = StatutPresence.Présent;
      this.action = inscription.Libelle + $localize` est présent à la séance ` + libelleseab;
    } else if (statut == false) {
      inscription.StatutSeance = StatutPresence.Absent;
      this.action = inscription.Libelle + $localize` est absent à la séance ` + libelleseab;
    } else if (statut == null) {
      inscription.StatutSeance = null;
    }
    if (inscription.ID == 0) {

      this.inscriptionserv.Add(inscription.datasource).then((id) => {
        inscription.ID = id;
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
        this.Load();

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
          this.Load();
        } else {
          inscription.StatutSeance = oldstatut
          let o = errorService.UnknownError(this.action);
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
    let phone = "";
    if (ins.ContactsUrgence.length> 0) {
      if (ins.ContactsUrgence.find(x => x.Type == "PHONE")) {
        phone = ins.ContactsUrgence.find(x => x.Type == "PHONE").Value
        return phone;
      } else {
        phone = ins.ContactsUrgence[0].Value;
      }
    }
    if (ins.Contacts.find(x => x.Type == "PHONE")) {
      phone = ins.Contacts.find(x => x.Type == "PHONE").Value
      return phone;
    }
    if(phone.length>0){
      return phone;
    }
    if (ins.Contacts.length > 0) {
      return ins.Contacts[0].Value;
    } else {
      return "";
    }
  }
contact_urgence_nom(ins: InscriptionMaSeance): string {
  let phone = "";
    if (ins.ContactsUrgence.length> 0) {
      if (ins.ContactsUrgence.find(x => x.Type == "PHONE")) {
        phone = ins.ContactsUrgence.find(x => x.Type == "PHONE").Notes
        return phone;
      } else {
        phone = ins.ContactsUrgence[0].Notes;
      }
    }
    if (ins.Contacts.find(x => x.Type == "PHONE")) {
      phone = ins.Contacts.find(x => x.Type == "PHONE").Notes
      return phone;
    }
    if(phone.length>0){
      return phone;
    } else {
      return "";
    }
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
      if (statut == "annulée") {
        this.thisSeance.statut = StatutSeance.annulée;
        let confirm_mess = window.confirm($localize`Voulez-vous envoyer un email à l'ensemble des participants potentiels de cette séance pour les prévenir de l'annulation ?`);
        if (confirm_mess) {
          window.alert("Fontion non diposnible");
        }
      } else {
        this.thisSeance.statut = StatutSeance.réalisée;
      }
    } else {
      let o = errorService.UnknownError(this.action);
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
      let o = errorService.UnknownError(this.action);
      errorService.emitChange(o);
    }
  }).catch((err: HttpErrorResponse) => {
    let o = errorService.CreateError(this.action, err.message);
    errorService.emitChange(o);
  })
}
ngAfterViewInit(): void {
  this.waitForScrollableContainer();
}

private waitForScrollableContainer(): void {
  setTimeout(() => {
    if (this.scrollableContent) {
      this.scrollableContent.nativeElement.addEventListener(
        'scroll',
        this.onContentScroll.bind(this)
      );
    } else {
      this.waitForScrollableContainer(); // Re-tente de le trouver
    }
  }, 100); // Réessaie toutes les 100 ms
}

onContentScroll(): void {
  const scrollTop = this.scrollableContent.nativeElement.scrollTop || 0;
  this.showScrollToTop = scrollTop > 200;
}

scrollToTop(): void {
  this.scrollableContent.nativeElement.scrollTo({
    top: 0,
    behavior: 'smooth', // Défilement fluide
  });
}
}

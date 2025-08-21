import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ErrorService } from '../../services/error.service';
import { InscriptionSeanceService } from '../../services/inscription-seance.service';
import { SeancesService } from '../../services/seance.service';
import { FullInscriptionSeance_VM, InscriptionSeance_VM, InscriptionStatus_VM, SeanceStatus_VM } from '@shared/lib/inscription_seance.interface';
import { Adherent_VM } from '@shared/lib/member.interface';
import { Seance_VM, StatutSeance } from '@shared/lib/seance.interface';
@Component({
  standalone: false,
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
  thisSeance: Seance_VM;
  afficher_admin: boolean = false;
  Autres: Adherent_VM[] = [];
  Inscrits: FullInscriptionSeance_VM[] = [];
  Potentiels: FullInscriptionSeance_VM[] = [];
  All: FullInscriptionSeance_VM[] = [];
  Absents: FullInscriptionSeance_VM[] = [];
  Presents: FullInscriptionSeance_VM[] = [];
  adherent_to: FullInscriptionSeance_VM;
  action: string;
  seanceText: string;
  constructor( private seanceserv: SeancesService, private router: Router, private route: ActivatedRoute, private inscriptionserv: InscriptionSeanceService) {

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
        inscription.StatutInscription = "présent";
        break;
      case 'essai':
        this.action = inscription.Libelle + $localize` est à l'essai pour la séance ` + libelleseab;
        inscription.StatutInscription = "essai";
        break;
      case 'absent':
        this.action = inscription.Libelle + $localize` devrait être absent à la séance ` + libelleseab;
        inscription.StatutInscription = "absent";
        break;
      case 'convoqué':
        this.action = inscription.Libelle + $localize` devrait être présent à la séance ` + libelleseab;
        inscription.StatutInscription = "convoqué";
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
    this.inscriptionserv.GetAllSeanceFull(this.id).then((res) => {
      this.Inscrits = res.filter(x => x.statut_seance == null && x.statut_inscription == InscriptionStatus_VM.PRESENT);
      this.Potentiels = res.filter(x => x.statut_seance == null && x.statut_inscription == null);
      this.All =  res.filter(x => x.statut_seance == null);
      this.Absents = res.filter(x => x.statut_seance == SeanceStatus_VM.ABSENT);
      this.Presents = res.filter(x => x.statut_seance == SeanceStatus_VM.PRESENT);
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

  MAJInscription(inscription: FullInscriptionSeance_VM, statut: boolean) {

    const errorService = ErrorService.instance;
    let oldstatut = inscription.statut_seance;
    let libelleseab = this.thisSeance.libelle;
    if (statut == true) {
      inscription.statut_inscription = InscriptionStatus_VM.PRESENT;
      this.action = inscription.person.libelle + $localize` est présent à la séance ` + libelleseab;
    } else if (statut == false) {
      inscription.statut_inscription = InscriptionStatus_VM.ABSENT;
      this.action = inscription.person.libelle + $localize` est absent à la séance ` + libelleseab;
    } else if (statut == null) {
      inscription.statut_seance = null;
    }
    if (inscription.id == 0) {

      this.inscriptionserv.Add(inscription).then((id) => {
        inscription.id = id;
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
        this.Load();

      }).catch((err: HttpErrorResponse) => {
        inscription.statut_seance = oldstatut
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      })
    } else {
      this.inscriptionserv.Update(inscription).then((retour) => {
        if (retour) {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
          this.Load();
        } else {
          inscription.statut_seance = oldstatut
          let o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
        }

      }).catch((err: HttpErrorResponse) => {
        inscription.statut_seance = oldstatut
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      })
    }
  }

  contact_urgence(ins: FullInscriptionSeance_VM): string {
    let phone = "";
    if (ins.person.contact_prevenir.length> 0) {
      if (ins.person.contact_prevenir.find(x => x.Type == "PHONE")) {
        phone = ins.person.contact_prevenir.find(x => x.Type == "PHONE").Value
        return phone;
      } else {
        phone = ins.person.contact_prevenir[0].Value;
      }
    }
    if (ins.person.contact.find(x => x.Type == "PHONE")) {
      phone = ins.person.contact.find(x => x.Type == "PHONE").Value
      return phone;
    }
    if(phone.length>0){
      return phone;
    }
    if (ins.person.contact.length > 0) {
      return ins.person.contact[0].Value;
    } else {
      return "";
    }
  }
contact_urgence_nom(ins: FullInscriptionSeance_VM): string {
  let phone = "";
    if (ins.person.contact_prevenir.length> 0) {
      if (ins.person.contact_prevenir.find(x => x.Type == "PHONE")) {
        phone = ins.person.contact_prevenir.find(x => x.Type == "PHONE").Notes
        return phone;
      } else {
        phone = ins.person.contact_prevenir[0].Notes;
      }
    }
    if (ins.person.contact.find(x => x.Type == "PHONE")) {
      phone = ins.person.contact.find(x => x.Type == "PHONE").Notes
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

    this.action = $localize`Convoquer ` + this.adherent_to.person.libelle;
    this.adherent_to.seance_id = this.thisSeance.seance_id;
    this.adherent_to.statut_inscription = InscriptionStatus_VM.CONVOQUE;
    this.adherent_to.statut_seance = null;
      const conv: InscriptionSeance_VM = {
              id: 0,
              rider_id: this.adherent_to.person.id,
              seance_id: this.adherent_to.seance_id,
              date_inscription: new Date(),
              statut_inscription: this.adherent_to.statut_inscription,
              statut_seance: null
            };
    this.inscriptionserv.Add(conv).then((id) => {
      this.adherent_to.id = id;
      this.inscriptionserv.GetFull(id).then((ins) => {
        this.All.push(ins);
        this.Autres = this.Autres.filter(x => x.id !== ins.rider_id);
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

GetNbPersonne(liste: FullInscriptionSeance_VM[]): boolean {
  if (this.thisSeance.est_place_maximum) {
    let ct = liste.filter(x => x.statut_seance == SeanceStatus_VM.PRESENT).length;
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
      this.thisSeance.statut = StatutSeance.réalisée;
      break;
    case 'prévue':
      this.action = $localize`Planifier la séance`;
      this.thisSeance.statut = StatutSeance.prévue;
      break;
    case 'annulée':
      this.action = $localize`Annuler la séance`;
      this.thisSeance.statut = StatutSeance.annulée;
      break;
  }
  this.seanceserv.Update(this.thisSeance).then((retour) => {
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

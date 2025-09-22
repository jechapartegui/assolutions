import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, effect, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ErrorService } from '../../services/error.service';
import { InscriptionSeanceService } from '../../services/inscription-seance.service';
import { SeancesService } from '../../services/seance.service';
import { FullInscriptionSeance_VM, InscriptionSeance_VM, InscriptionStatus_VM, SeanceStatus_VM } from '@shared/lib/inscription_seance.interface';
import { Adherent_VM } from '@shared/lib/member.interface';
import { Seance_VM, StatutSeance } from '@shared/lib/seance.interface';
import { Personne_VM } from '@shared/lib/personne.interface';
import { AppStore } from '../app.store';
import { AdherentService } from '../../services/adherent.service';
import { MailService } from '../../services/mail.service';
import { Compte_VM, KeyValuePairAny } from '@shared/index';
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
  Notes:string="";
  variables: Record<string, any> = {};
  adherent_to: Adherent_VM = null;
  action: string;
  seanceText: string;
  login:string = null;
  reponse:boolean = null;
  adherent:number = null;
   isLien = false;
  private _loadLoginDone = false;

  MesAdherents:FullInscriptionSeance_VM[]=[];
  constructor(public store:AppStore, public riderservice:AdherentService, public cdr:ChangeDetectorRef,
    private seanceserv: SeancesService, private router: Router, private route: ActivatedRoute, 
    private inscriptionserv: InscriptionSeanceService, private mailserv:MailService) {
       effect(() => {
    const logged = this.store.isLoggedIn();
    const compte = this.store.compte();
   if (!this._loadLoginDone && logged && compte) {
      this._loadLoginDone = true;
      this.LoadLogin(compte);
    }
  });

  }

async ngOnInit(): Promise<void> {
  const errorService = ErrorService.instance;
  this.action = $localize`Charger la séance`;

  // 1) Récupérer les params de façon synchrone
  const params = this.route.snapshot.queryParams as { [k: string]: string | undefined };

  // 2) Gérer l'id de séance
  if (this.id === 0) {
    if (params['id']) {
      this.id = +params['id'];
    } else {
      this.router.navigate(['/menu']);
      this.store.updateSelectedMenu("MENU");
      return;
    }
  }

  // 3) Déterminer le contexte "lien" avant tout chargement

  if (params['login']) {
    this.isLien = true;
    this.login = params['login'];
  
  }
  if (params['adherent']) {
    this.isLien = true;
    this.adherent = +params['adherent'];   
  }
    if (params['adherent']) {
    this.isLien = true;
    this.adherent = +params['adherent'];   
  }
   if (params['reponse'] !== undefined) {
    this.isLien = true;
    // "0" => false, "1" => true ; si autre chose => null
    const r = params['reponse']!;
    this.reponse = r === '0' ? false : r === '1' ? true : null;
  }

if (this.isLien && this.login && !this.adherent) {
  this.inscriptionserv.GetAdherentCompte(this.login, this.id)
    .then((liste) => {
      (liste ?? []).forEach((obj: any) => Personne_VM.bakeLibelle(obj.person));
      this.MesAdherents = liste ?? [];
    })
    .catch((error) => {
      const n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
    });

} else if (this.isLien && this.login && this.adherent) {
  this.inscriptionserv.GetAdherentPersonne(this.adherent, this.id)
  .then((liste) => {
      (liste ?? []).forEach((obj: any) => Personne_VM.bakeLibelle(obj.person));
      this.MesAdherents = liste ?? [];
    })
    .catch((error) => {
      const n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
    });
}

  

  // 4) Charger la séance
  try {
    const ss = await this.seanceserv.Get(this.id);
    this.thisSeance = ss;
    this.generateSeanceText();

    // 5) Ne pas appeler Load() si on est dans le contexte "lien"
    if (!this.isLien) {
      this.Load();
    } else {
      // console.log("lien"); // si tu veux tracer
    }
  } catch (error) {
    const n = errorService.CreateError(this.action, error);
    errorService.emitChange(n);
  }
}

AfficherMenu(){
  
                    this.router.navigate(['/menu']);
                    this.store.updateSelectedMenu("MENU");
}


  LoadLogin(compte:Compte_VM){
    const errorService = ErrorService.instance;
     this.action = $localize`Charger les adhérents de mon compte`;
          this.login = compte.email;
          if(!this.adherent){
            
   this.inscriptionserv.GetAdherentCompte(this.login, this.thisSeance.seance_id).then((fis) =>{
            fis.forEach(p => Personne_VM.bakeLibelle(p.person));
            this.MesAdherents = fis;
            if(this.reponse != null){
              
            let statins = this.reponse ? InscriptionStatus_VM.PRESENT : InscriptionStatus_VM.ABSENT
            console.log(statins);
     this.action = $localize`Mise à jour des présences`;
            fis.forEach((ins) =>{
              ins.statut_inscription = statins;
              if(!ins.id || ins.id == 0){
                this.inscriptionserv.Add(ins).then((id_) =>{
                  ins.id = id_;
                 }).catch((error) => {
      let n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
    }); 
              } else {
                 this.inscriptionserv.Update(ins).then(() =>{
                 }).catch((error) => {
      let n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
    }); 
              }
            })
            

            }
         }).catch((error) => {
      let n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
    }); 
          } else {
   this.inscriptionserv.GetAdherentPersonne(this.adherent, this.thisSeance.seance_id) .then((liste) => {
      (liste ?? []).forEach((obj: any) => Personne_VM.bakeLibelle(obj.person));
      this.MesAdherents = liste ?? [];
            if(this.reponse != null){
              
            let statins = this.reponse ? InscriptionStatus_VM.PRESENT : InscriptionStatus_VM.ABSENT
            console.log(statins);
     this.action = $localize`Mise à jour des présences`;
              liste[0].statut_inscription = statins;
              if(!liste[0].id || liste[0].id == 0){
                this.inscriptionserv.Add(liste[0]).then((id_) =>{
                  liste[0].id = id_;
                 }).catch((error) => {
      let n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
    }); 
              } else {
                 this.inscriptionserv.Update(liste[0]).then(() =>{
                 }).catch((error) => {
      let n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
    }); 
              }
            

            }
         }).catch((error) => {
      let n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
    }); 
          }
       
  }

optionsOpen = false;
toggleMobileOptions = false;
uiMode: 'list' | 'convocation' | 'annulation' | 'ajout' | 'note' = 'list';

// Mail panel state
selectedRecipients: FullInscriptionSeance_VM[] = [];
mailSubject = '';
mailBody = '';

// Ouvre un panneau et prépare les presets
openPanel(mode: 'convocation'|'annulation'|'ajout'|'note') {
  this.uiMode = mode;
  this.optionsOpen = false;
  this.toggleMobileOptions = false;
  this.Notes = ''; // reset notes
this.variables = {
   SEANCE: this.thisSeance.libelle,
  SEANCE_ID: this.thisSeance.seance_id,
  PERSONNE_ID: this.selectedRecipients[0]?.id ?? 0,
  DATE: formatDDMMYYYY(this.thisSeance.date_seance),
  ID: this.thisSeance.seance_id,
  NOM: $localize`Prénom Nom`,
  LIEU: this.thisSeance.lieu_nom ?? 'lieu non défini',
  HEURE: this.thisSeance.heure_debut ?? 'heure non définie',
  RDV: this.thisSeance.rdv ?? '',
  DUREE: (this.thisSeance.duree_seance != null) ? `${this.thisSeance.duree_seance} min` : 'durée non définie',
  NOTES: this.Notes
  };


  if (mode === 'convocation') {
   const errorService = ErrorService.instance;
        this.action = $localize`Chargement du template de convocation`;
    this.selectedRecipients = this.All.filter(p => p.statut_inscription === 'convoqué');
      this.mailserv.GetMail(mode).then((retour:KeyValuePairAny) =>{
    this.mailSubject = retour.key;
    this.mailBody = retour.value;
  this.Notes = ''; // reset notes
   }).catch((err: HttpErrorResponse) => {
     // Par défaut : tous les "convoqué"
    this.mailSubject = `[Convocation] ${this.thisSeance?.libelle ?? ''}`;
    this.mailBody =
`Bonjour,

Vous êtes convoqué(e) pour la séance ${this.seanceText}.
Merci de confirmer votre présence.

Sportivement,`;
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      })
   
  } else if (mode === 'annulation') {
   const errorService = ErrorService.instance;
        this.action = $localize`Chargement du template d'annulation`;
    this.selectedRecipients = [...this.All];
      this.mailserv.GetMail(mode).then((retour:KeyValuePairAny) =>{
    this.mailSubject = retour.key;
    this.mailBody = retour.value;
    

   }).catch((err: HttpErrorResponse) => {
     // Par défaut : tous les "convoqué"
 this.mailSubject = `[Annulation] ${this.thisSeance?.libelle ?? ''}`;
    this.mailBody =
`Bonjour,

La séance ${this.seanceText} est annulée.
Désolé(e) pour la gêne occasionnée.`;
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      })
   
  }
}

closePanel(){ this.uiMode = 'list'; }

// Helpers sélection
isChecked(p: any, kind: 'convocation'|'annulation'){ 
  return this.selectedRecipients?.some(x => x === p);
}
toggleRecipient(p: any, kind: 'convocation'|'annulation', checked: boolean){
  if (checked){
    if (!this.selectedRecipients.some(x => x === p)) this.selectedRecipients.push(p);
  } else {
    this.selectedRecipients = this.selectedRecipients.filter(x => x !== p);
  }
}
checkAll(kind:'convocation'|'annulation', val:boolean){
  if (kind==='convocation'){
    this.selectedRecipients = val ? this.All.filter(p => p.statut_inscription === 'convoqué') : [];
  } else {
    this.selectedRecipients = val ? [...this.All] : [];
  }
}

// Envoi (branche sur ton service réel si dispo)
sendMail(kind: 'convocation'|'annulation'){
  if(kind=='annulation'){
  let c =window.confirm($localize`Voulez-vous passer le statut de la séance à Annulée ?`);
  if(c){
        this.action = $localize`Annuler la séance`;
    this.thisSeance.statut = "annulée";
  this.seanceserv.Update(this.thisSeance).then(() =>{
     let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
   }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      })
  }

  }
   const errorService = ErrorService.instance;
        this.action = $localize`Envoi du mail`;
  // TODO: brancher ici ton service d’envoi / template réel
 this.mailserv.EnvoyerConvocationAnnulation(kind, this.selectedRecipients.map(x => x.person.id),this.Notes, this.thisSeance.seance_id).then(() =>{
     let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
   }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      })
  this.closePanel();
}

// Sauvegarde de la note de séance
saveInfoSeance(){
   const errorService = ErrorService.instance;
        this.action = $localize`Note sauvegardée`;

  this.seanceserv.Update(this.thisSeance).then(() =>{
     let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
   }).catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      })
  this.closePanel();
}
  setStatus(statut, inscription: FullInscriptionSeance_VM) {
    inscription.isVisible = false;
    const errorService = ErrorService.instance;
    let oldstatut = inscription.statut_inscription;
    let libelleseab = this.thisSeance.libelle;
    switch (statut) {
      default:
        this.action = inscription.person.libelle + $localize` a un statut inconnu pour la séance ` + libelleseab;
        inscription.statut_inscription = null;
        break;
      case 'présent':
        this.action = inscription.person.libelle + $localize` devrait être présent à la séance ` + libelleseab;
        inscription.statut_inscription = InscriptionStatus_VM.PRESENT;
        break;
      case 'essai':
        this.action = inscription.person.libelle + $localize` est à l'essai pour la séance ` + libelleseab;
        inscription.statut_inscription = InscriptionStatus_VM.ESSAI;
        break;
      case 'absent':
        this.action = inscription.person.libelle + $localize` devrait être absent à la séance ` + libelleseab;
        inscription.statut_inscription = InscriptionStatus_VM.ABSENT;
        break;
      case 'convoqué':
        this.action = inscription.person.libelle + $localize` devrait être présent à la séance ` + libelleseab;
        inscription.statut_inscription = InscriptionStatus_VM.CONVOQUE;
        break;

    }

    if (!inscription.id ||inscription.id == 0) {

      this.inscriptionserv.Add(inscription).then((id) => {
        inscription.id = id;
        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
        this.Load();

      }).catch((err: HttpErrorResponse) => {
        inscription.statut_inscription = oldstatut
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      })
    } else {
      this.inscriptionserv.Update(inscription).then(() => {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
          this.Load();

      }).catch((err: HttpErrorResponse) => {
        inscription.statut_inscription = oldstatut
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        return;
      })
    }
  }

  RetourListe(){
    this.router.navigate(['/seance'], { queryParams: { id: this.thisSeance.seance_id } });
  }

  Load() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la séance`;
    this.inscriptionserv.GetAllSeanceFull(this.id).then((res) => {
       res.forEach(p => {
      if (p?.person) {
        Object.setPrototypeOf(p.person, Personne_VM.prototype);
        // 2) (Optionnel) matérialiser la valeur pour la sérialisation / filtres ultérieurs
        // (p.person as any).libelle = p.person.libelle;
      }
    });
      this.Inscrits = res.filter(x => !x.statut_seance && x.statut_inscription == InscriptionStatus_VM.PRESENT);
      this.Potentiels = res.filter(x => !x.statut_seance && !x.statut_inscription);
      this.All =  res.filter(x => !x.statut_seance);
      this.Absents = res.filter(x => x.statut_seance == SeanceStatus_VM.ABSENT);
      this.Presents = res.filter(x => x.statut_seance == SeanceStatus_VM.PRESENT);
       this.riderservice
          .GetAdherentAdhesion(this.store.saison_active().id)
          .then((riders) => {
            riders.forEach(p => Personne_VM.bakeLibelle(p));
            this.Autres = riders.filter(x => !res.find(y => y.person.id == x.id));
          }
          ).catch((error) => {
            let n = errorService.CreateError("Chargement", error);
            errorService.emitChange(n);
          });
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
      inscription.statut_seance = SeanceStatus_VM.PRESENT;
      this.action = inscription.person.libelle + $localize` est présent à la séance ` + libelleseab;
    } else if (statut == false) {
      inscription.statut_seance = SeanceStatus_VM.ABSENT;
      this.action = inscription.person.libelle + $localize` est absent à la séance ` + libelleseab;
    } else if (statut == null) {
      inscription.statut_seance = null;
    }
    if (!inscription.id || inscription.id == 0) {

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
      this.inscriptionserv.Update(inscription).then(() => {
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
          this.Load();

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

    this.action = $localize`Convoquer ` + this.adherent_to.libelle;
      const conv: InscriptionSeance_VM = {
              id: 0,
              rider_id: this.adherent_to.id,
              seance_id: this.thisSeance.seance_id,
              date_inscription: new Date(),
              statut_inscription: InscriptionStatus_VM.CONVOQUE,
              statut_seance: null
            };
    this.inscriptionserv.Add(conv).then((id) => {
      conv.id = id;
      this.Load();
      this.adherent_to = null;
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

IsPresent(adh:FullInscriptionSeance_VM){
  if(adh.statut_inscription && adh.statut_inscription == InscriptionStatus_VM.PRESENT){
    return true;
  } else {
    return false;
  }
}
IsAbsent(adh:FullInscriptionSeance_VM){
  if(adh.statut_inscription && adh.statut_inscription == InscriptionStatus_VM.ABSENT){
    return true;
  } else {
    return false;
  }
}
ChangerPresent(adh:FullInscriptionSeance_VM, present:boolean){
  let statutins =InscriptionStatus_VM.ABSENT;
  if(present){
    statutins =InscriptionStatus_VM.PRESENT;
  }
  adh.statut_inscription = statutins;
   const errorService = ErrorService.instance;
  this.action = $localize`Mettre à  jour le statut`;
 if(!adh.id || adh.id == 0){
                this.inscriptionserv.Add(adh).then((id_) =>{
                  adh.id = id_;
                 }).catch((error) => {
      let n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
    }); 
              } else {
                 this.inscriptionserv.Update(adh).then(() =>{
                 }).catch((error) => {
      let n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
    }); 
              }
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
openMenu(potentiel: any, ev: MouseEvent) {
    ev.stopPropagation();              // évite la fermeture immédiate
    this.closeAllMenus();
    potentiel.isVisible = true;
    this.cdr.markForCheck?.();         // utile si OnPush
  }

  /** Optionnel : ferme après avoir choisi une action */
  setStatusAndClose(status: any, potentiel: FullInscriptionSeance_VM, ev?: MouseEvent) {
    ev?.stopPropagation();
    this.setStatus(status, potentiel);
    this.closeAllMenus();
    this.cdr.markForCheck?.();
  }
 private closeAllMenus() {
  console.log("close all menus");
    // si les menus n’existent que dans All, c’est suffisant
    this.All?.forEach(p => (p.isVisible = false));
      this.Inscrits?.forEach(p => (p.isVisible = false));
      this.Potentiels?.forEach(p => (p.isVisible = false));
      this.Absents?.forEach(p => (p.isVisible = false));
      this.Presents?.forEach(p => (p.isVisible = false));
  }
   @HostListener('document:click', ['$event'])
  onDocumentClick(_: MouseEvent) {
    this.closeAllMenus();
  }

  /** Bonus : touche Échap pour fermer */
  @HostListener('document:keydown.escape', ['$event'])
  onEsc(_: KeyboardEvent) {
    this.closeAllMenus();
  }
}
export function formatDDMMYYYY(input: unknown): string {
  const d = toDateSafe(input);
  if (!d) return ''; // ou retourne '??/??/????'
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
export function toDateSafe(input: unknown): Date | null {
  if (!input) return null;
  if (input instanceof Date) return new Date(input.getTime());

  if (typeof input === 'string') {
    const s = input.trim();

    // Cas le plus fréquent avec TypeORM Postgres "date" -> 'YYYY-MM-DD'
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
      return new Date(y, mo, d); // évite les décalages de fuseau
    }

    // Sinon, tente un parse standard (ISO, etc.)
    const ms = Date.parse(s);
    if (!Number.isNaN(ms)) return new Date(ms);

    return null;
  }

  if (typeof input === 'number') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

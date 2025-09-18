import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MailData } from '../../class/mail';
import { AdherentService } from '../../services/adherent.service';
import { ErrorService } from '../../services/error.service';
import { GroupeService } from '../../services/groupe.service';
import { MailService } from '../../services/mail.service';
import { ProjetService } from '../../services/projet.service';
import { SeancesService } from '../../services/seance.service';
import { KeyValuePair, KeyValuePairAny } from '@shared/lib/autres.interface';
import { GlobalService } from '../../services/global.services';
import { Adherent_VM } from '@shared/lib/member.interface';
import { Seance_VM } from '@shared/lib/seance.interface';
import { AppStore } from '../app.store';
import { Groupe_VM } from '@shared/index';
import { formatDDMMYYYY } from '../ma-seance/ma-seance.component';

type Etape = 'SELECTION_MAIL' | 'PARAMETRE' | 'AUDIENCE' | 'BROUILLON';
type Audience  =  'TOUS' | 'GROUPE' | 'SEANCE' | 'ADHERENT';
type Typemail = 'relance' | 'annulation' | 'convocation' | 'libre'| 'essai';
@Component({
  standalone: false,
  selector: 'app-envoi-mail',
  templateUrl: './envoi-mail.component.html',
  styleUrls: ['./envoi-mail.component.css'],
})
export class EnvoiMailComponent implements OnInit {
  ouvert_type_mail = true;
  ouvert_param = false;
  ouvert_audience = false;
  ouvert_brouillon = false;
  ouvert_mail = false;

  date_debut: string;
  date_fin: string;
  params: KeyValuePairAny[] = [];
  action: string;
  
  variables: Record<string, any> = {};

  liste_groupe: Groupe_VM[] = [];
  groupe_selectionne: number;

  liste_adherent: Adherent_VM[] = [];
  ListeUserSelectionne: Adherent_VM[] = [];
  adherent_selectionne: Adherent_VM;

  seance_periode: Seance_VM[] = [];
  seance_selectionnee: Seance_VM;

  liste_mail: MailData[] = [];
  selected_mail: MailData;
  mail_selectionne: MailData;

  mail_a_generer: string;
  subject_mail_a_generer: string;


  etape: Etape = 'SELECTION_MAIL';
  audience:Audience = "TOUS";
  typemail:Typemail;
  mailSubject: string;
  mailBody: string;
  adherent_generer_vue:Adherent_VM = null;
  

  constructor(
    public adh_serv: AdherentService,
    public gr_serv: GroupeService,
    public seance_serv: SeancesService,
    public mail_serv: MailService,
    public proj_serv: ProjetService,
    public GlobalService: GlobalService,
    public store: AppStore
  ) {}

  ngOnInit(): void {}

  formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = ('0' + (date.getMonth() + 1)).slice(-2);
    const d = ('0' + date.getDate()).slice(-2);
    return `${y}-${m}-${d}`;
  }

  goto(step: Etape) {
  this.etape = step;
  // on ouvre seulement le panneau de l'étape visée, pour rester “card scroller”
  this.ouvert_type_mail = (step === 'SELECTION_MAIL');
  this.ouvert_param     = (step === 'PARAMETRE');
  this.ouvert_audience  = (step === 'AUDIENCE');
  this.ouvert_brouillon = (step === 'BROUILLON');
}



/** Autorisations de navigation (avance possible quand les prérequis sont satisfaits). */
canGoTo(step: Etape): boolean {
  switch (step) {
    case 'SELECTION_MAIL':
      return true; // toujours OK (revenir en arrière)
    case 'PARAMETRE':
      // avoir choisi un type (ou LIBRE qui saute la plage)
      return !!this.typemail;
    case 'AUDIENCE':
      // si “LIBRE”, pas de plage requise ; sinon dates présentes
      return this.typemail === 'libre'
        ? true
        : (!!this.date_debut && !!this.date_fin);
    case 'BROUILLON':
      // on a déjà généré au moins un mail (retour possible si brouillon existant)
      return (this.liste_mail && this.liste_mail.length > 0) || !!this.mail_a_generer;
    default:
      return false;
  }
}

  GoToParam(type: Typemail) {
    const auj = new Date();
    const nextMonth = new Date(auj);
    this.date_debut = this.formatDate(auj);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    this.date_fin = this.formatDate(nextMonth);

    this.typemail = type;
    this.etape = 'PARAMETRE';
    this.ouvert_type_mail = false;
    this.ouvert_param = true;
  }

  Libre() {
    this.typemail = "libre";
    this.etape = 'AUDIENCE';
    this.ValiderPlage();
  }

  ValiderPlage() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger l'audience`;
   this.variables = {
   DATE_DEBUT: formatDDMMYYYY(this.date_debut),
  DATE_FIN: formatDDMMYYYY(this.date_fin),
  };


    this.adh_serv.GetAdherentAdhesion(this.store.saison_active().id)
      .then(list => {
                    this.liste_adherent = list.map(data =>
  Object.assign(new Adherent_VM(), data)
);
        return this.gr_serv.GetAll();
      })
      .then(lg => {
        this.liste_groupe = lg;
        return this.seance_serv.GetSeances();
      })
      .then(seances => {

        this.seance_periode =  seances.sort((a, b) => {
          const nomA = a.date_seance; // Ignore la casse lors du tri
          const nomB = b.date_seance;
          let comparaison = 0;
          if (nomA > nomB) {
            comparaison = 1;
          } else if (nomA < nomB) {
            comparaison = -1;
          }

          return  comparaison; // Inverse pour le tri descendant
        });
        this.etape = 'AUDIENCE';
        this.ouvert_param = false;
        this.ouvert_audience = true;
      })
      .catch((err: HttpErrorResponse) => {
        const o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }


AddUsers(inscrit: boolean = false) {
  const isInscrit = (v: any) =>
    v === true || v === 1 || v === '1' || v === 'true'; // robustesse si la source n'est pas booléenne

  const src = this.liste_adherent ?? [];

  this.ListeUserSelectionne = inscrit
    ? src.filter(e => isInscrit(e.inscrit)) // seulement les inscrits
    : [...src];                              // tous les adhérents
}


  AddGroupe() {
    if (!this.ListeUserSelectionne) this.ListeUserSelectionne = [];
    if (this.groupe_selectionne) {
      const list = this.liste_adherent.filter(x =>
        x.inscriptionsSaison?.[0]?.groupes?.map(g => g.id).includes(this.groupe_selectionne)
      );
      // éviter les doublons
      const existing = new Set(this.ListeUserSelectionne.map(p => p.id));
      this.ListeUserSelectionne.push(...list.filter(p => !existing.has(p.id)));
    }
  }

  RemoveUsers() {
    this.ListeUserSelectionne = [];
  }

  ValiderDestinataire() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger le template du mail`;
    this.etape = 'BROUILLON';
    this.ouvert_brouillon = true;
    this.ouvert_audience = false;

    this.mail_serv.GetMail(this.typemail)
      .then(kvp => {
        this.subject_mail_a_generer = kvp.key;
        this.mail_a_generer = kvp.value;
        this.variables = [];
      })
      .catch((err: HttpErrorResponse) => {
        const o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }

  RemoveUser(user: Adherent_VM) {
    this.ListeUserSelectionne = this.ListeUserSelectionne.filter(x => x.id !== user.id);
  }

  GenererVue() {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger le contenu du mail`;
    this.mail_serv.simuler(this.adherent_generer_vue.id, this.typemail, this.variables).then((mail:KeyValuePairAny) =>{
      this.mailBody = mail.value;
      this.mailSubject = mail.key;
   })
      .catch((err: HttpErrorResponse) => {
        const o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
    const champ_sujet = this.getPlaceholders(this.subject_mail_a_generer);
    const champ_mail = this.getPlaceholders(this.mail_a_generer);
    console.log(champ_sujet, champ_mail);    
  }

getPlaceholders(text: string): { global: string[]; loop: string[] } {
  if (!text) return { global: [], loop: [] };

  const loopRe = /\[\[([\s\S]*?)\]\]/g;    // capte chaque bloc [[ ... ]] (multi-lignes)
  const phRe   = /{{\s*([^{}]+?)\s*}}/g;   // capte {{ PLACEHOLDER }}

  const loopSet = new Set<string>();
  const globalSet = new Set<string>();

  // 1) Placeholders à l'intérieur des boucles
  for (const m of text.matchAll(loopRe)) {
    const block = m[1];
    for (const pm of block.matchAll(phRe)) loopSet.add(pm[1].trim());
  }

  // 2) Placeholders hors boucles
  const outside = text.replace(loopRe, "");
  for (const pm of outside.matchAll(phRe)) globalSet.add(pm[1].trim());

  return { global: [...globalSet], loop: [...loopSet] };
}





  SauvegarderTemplate() {
    const errorService = ErrorService.instance;
    this.action = $localize`Sauvegarder le template`;
    this.mail_serv.SauvegarderTemplate(
      this.mail_a_generer,
      this.subject_mail_a_generer,
      this.typemail
    )
    .then(ok => {
      const o = ok ? errorService.OKMessage(this.action)
                   : errorService.UnknownError(this.action);
      errorService.emitChange(o);
    })
    .catch((err: HttpErrorResponse) => {
      const o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    });
  }

  // ✅ Une seule étape visible: parfait pour la card scroller
  vue(thisvue: 'SELECTION_MAIL' | 'PARAMETRE' | 'AUDIENCE' | 'BROUILLON' | 'ENVOI'): boolean {
    return this.etape === thisvue;
  }

  AddSeanceTous() { /* TODO */ }
  AddSeancePresent() { /* TODO */ }
  AddSeanceConvoque() { /* TODO */ }

  Addherent() {
    if (!this.adherent_selectionne) return;
    if (!this.ListeUserSelectionne.find(x => x.id === this.adherent_selectionne.id)) {
      this.ListeUserSelectionne.push(this.adherent_selectionne);
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

  ValiderFormatEmail() {}

  async EnvoyerTousLesMails() {
    let nb_ok = 0;
    const nb_mail = this.liste_mail.length;
    let erreur = false;
    const errorService = ErrorService.instance;
    this.action = $localize`Envoyer tous les mails`;

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    const mailLimitPerMinute = 30;
    const interval = 60000 / mailLimitPerMinute;

    for (const mail of this.liste_mail) {
      try {
        const ok = await this.mail_serv.Envoyer(mail);
        if (ok) nb_ok++;
        else {
          erreur = true;
          errorService.emitChange(errorService.UnknownError(this.action));
        }
      } catch (err: any) {
        erreur = true;
        errorService.emitChange(errorService.CreateError(this.action, err.message));
      }
      await delay(interval);
    }

    if (!erreur) errorService.emitChange(errorService.OKMessage(this.action));
    console.log(`${nb_ok}/${nb_mail} mails envoyés.`);
  }

  EnvoiMail() {
    const errorService = ErrorService.instance;
    this.action = $localize`Envoyer l'email`;
    this.mail_serv.Envoyer(this.selected_mail)
      .then(ok => {
        const o = ok ? errorService.OKMessage(this.action)
                     : errorService.UnknownError(this.action);
        errorService.emitChange(o);
      })
      .catch((err: HttpErrorResponse) => {
        const o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }
}

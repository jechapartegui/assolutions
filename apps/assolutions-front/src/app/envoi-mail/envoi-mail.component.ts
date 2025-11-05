import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { AdherentService } from '../../services/adherent.service';
import { ErrorService } from '../../services/error.service';
import { GroupeService } from '../../services/groupe.service';
import { MailService } from '../../services/mail.service';
import { ProjetService } from '../../services/projet.service';
import { SeancesService } from '../../services/seance.service';
import { KeyValuePairAny } from '@shared/lib/autres.interface';
import { GlobalService } from '../../services/global.services';
import { Adherent_VM } from '@shared/lib/member.interface';
import { Seance_VM } from '@shared/lib/seance.interface';
import { AppStore } from '../app.store';
import { Groupe_VM } from '@shared/lib/groupe.interface';
import { Personne_VM } from '@shared/lib/personne.interface';
import { formatDDMMYYYY } from '../ma-seance/ma-seance.component';
import { TemplateType } from '../projet-mail/projet-mail.component';
import { InscriptionSeanceService } from '../../services/inscription-seance.service';
import { InscriptionStatus_VM } from '@shared/index';

type Etape = 'SELECTION_MAIL' | 'PARAMETRE' | 'AUDIENCE' | 'BROUILLON';
type Audience  =  'TOUS' | 'GROUPE' | 'SEANCE' | 'ADHERENT';
@Component({
  standalone: false,
  selector: 'app-envoi-mail',
  templateUrl: './envoi-mail.component.html',
  styleUrls: ['./envoi-mail.component.css'],
})
export class EnvoiMailComponent implements OnInit {

  // === UI lock additions (non-breaking) ===
  uiLock: boolean = false;

  /**
   * Helper to run a Promise-returning action while locking the UI.
   * Example: this.runLocked(this.somePromise());
   */
  runLocked<T = any>(p: Promise<T> | { finally?: () => void } | any): void {
    this.uiLock = true;
    try {
      if (p && typeof p.finally === 'function') {
        (p as Promise<any>).finally(() => { this.uiLock = false; });
      } else {
        this.uiLock = false;
      }
    } catch {
      this.uiLock = false;
    }
  }

  ouvert_type_mail = true;
  ouvert_param = false;
  ouvert_audience = false;
  ouvert_brouillon = false;
  ouvert_mail = false;

  date_debut: string;
  date_fin: string;
  action: string;
  
  variables: Record<string, any> = {};

  liste_groupe: Groupe_VM[] = [];
  groupe_selectionne: number;

  liste_adherent: Adherent_VM[] = [];
  ListeUserSelectionne: Adherent_VM[] = [];
  adherent_selectionne: Adherent_VM;
  liste_seance_serie:Seance_VM[] = [];

  seance_periode: Seance_VM[] = [];
  seance_selectionnee: Seance_VM;
  seance_annul_convoc: Seance_VM;
sujet_serie_seance:string="";

  mail_a_generer: string;
  subject_mail_a_generer: string;
  envoi_par_compte: boolean = false;

  log:string = "";


  etape: Etape = 'SELECTION_MAIL';
  audience:Audience = "TOUS";
  typemail:TemplateType;
  adherent_generer_vue:KeyValuePairAny = null;
  ListeGeneree:KeyValuePairAny[] = null;
  

  constructor(
    public adh_serv: AdherentService,
    public gr_serv: GroupeService,
    public seance_serv: SeancesService,
    public mail_serv: MailService,
    public proj_serv: ProjetService,
    public GlobalService: GlobalService,
    public inscriptionserv: InscriptionSeanceService,
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
      return (this.ListeGeneree && this.ListeGeneree.length > 0) 
    default:
      return false;
  }
}

  GoToParam(type: TemplateType) {
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

  async ValiderPlage() {
    this.uiLock = true;

    const errorService = ErrorService.instance;
    this.action = $localize`Charger l'audience`;
    if(this.typemail === 'relance'){
   this.variables = {
   DATE_DEBUT: formatDDMMYYYY(this.date_debut),
  DATE_FIN: formatDDMMYYYY(this.date_fin),
  };
} 
  
    this.adh_serv.GetAdherentAdhesion(this.store.saison_active().id).then(list => {
                    this.liste_adherent = list.map(data =>
  Object.assign(new Adherent_VM(), data)
);
        return this.gr_serv.GetAll();
      })
      .then(lg => {
        this.liste_groupe = lg;
      })
      .catch((err: HttpErrorResponse) => {
        const o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
if(this.typemail === 'annulation' || this.typemail === 'convocation' || this.typemail === 'relance'|| this.typemail === 'serie_seance'){
   await this.seance_serv.GetPlageDate(this.date_debut, this.date_fin).then(seances => {
      this.seance_periode = seances;
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
    });
} else {
 await this.seance_serv.GetSeances().then(seances => {
    this.seance_periode = seances;
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
    });
}

if(this.typemail === 'libre' || this.typemail === 'relance'){
  this.etape = 'AUDIENCE';
  this.audience = 'TOUS';
  this.ouvert_param = false;
  this.ouvert_audience = true;  
}

    this.uiLock = false;
}

ValiderSeance() {
    this.uiLock = true;

  if (!this.seance_annul_convoc) return;
  
  this.etape = 'AUDIENCE';
        this.audience = 'SEANCE';
        this.seance_selectionnee = this.seance_annul_convoc;
        this.ouvert_param = false;
        this.ouvert_audience = true;
        this.variables = {
          SEANCE_ID: this.seance_selectionnee.seance_id,
        };
    
    this.uiLock = false;
}
ValiderSerieSeance() {
    this.uiLock = true;

  if (!this.liste_seance_serie) return;
  
  this.etape = 'AUDIENCE';
        this.audience = 'GROUPE';
        this.ouvert_param = false;
        this.ouvert_audience = true;
        this.variables = {
          SERIE_SEANCE: this.liste_seance_serie.map(x => x.seance_id).join(', '),
          CHAMPIONNAT: this.sujet_serie_seance.trim()
        };
    
    this.uiLock = false;
}
RemoveSeanceSerie(_t146: Seance_VM) {
    const errorService = ErrorService.instance;
    this.action = $localize`Séance retirée`;
  this.liste_seance_serie = this.liste_seance_serie.filter(x => x.seance_id !== _t146.seance_id);
  let o = errorService.OKMessage(this.action);
  errorService.emitChange(o); 
}
AjouterSeanceSerie() {
    const errorService = ErrorService.instance;
    this.action = $localize`Séance ajoutée`;
  if (!this.seance_annul_convoc) return;
  if (!this.liste_seance_serie.find(x => x.seance_id === this.seance_annul_convoc.seance_id)) {
    this.liste_seance_serie.push(this.seance_annul_convoc);
    let o = errorService.OKMessage(this.action);
    errorService.emitChange(o);
  } else {
    let o = errorService.CreateError(this.action, $localize`Cette séance a déjà été ajoutée.`);
    errorService.emitChange(o);}
  
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
  // 0) Sécurité
  if (!this.liste_adherent) return;

  // 1) Normaliser l'id du groupe sélectionné
  const gid = this._selectedGroupId(this.groupe_selectionne);
  if (gid == null) return;

  // 2) Saison active (si pas de saison, on ne filtre pas sur la saison)
  const saisonActiveId = this.store?.saison_active?.()?.id ?? null;

  // 3) Filtre : adhérents qui ont une inscription sur la saison (si connue)
  //    ET qui contiennent le groupe sélectionné
  const list = this.liste_adherent.filter((x: any) => {
    const inscriptions = Array.isArray(x?.inscriptionsSaison) ? x.inscriptionsSaison : [];
    return inscriptions.some((ins: any) => {
      const saisonOK = saisonActiveId == null || ins?.saison_id === saisonActiveId;
      if (!saisonOK) return false;

      const groupes = Array.isArray(ins?.groupes) ? ins.groupes : [];
      // groupes peut être [{id: number}, ...] OU [number, ...]
      return groupes.some((g: any) => (g?.id ?? g) === gid);
    });
  });

  // 4) Fusion sans doublons (clé = id adhérent)
  const current = Array.isArray(this.ListeUserSelectionne) ? this.ListeUserSelectionne : [];
  const existing = new Set(current.map((p: any) => p?.id));
  const toAdd = list.filter((p: any) => !existing.has(p?.id));

  // 5) Remplacer la référence (OnPush-friendly)
  this.ListeUserSelectionne = [...current, ...toAdd];
}

// Helper : normaliser l'id du groupe sélectionné
private _selectedGroupId(sel: any): number | null {
  if (sel == null) return null;
  if (typeof sel === 'number') return sel;
  if (typeof sel === 'string') {
    const n = Number(sel);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof sel === 'object' && sel.id != null) {
    return typeof sel.id === 'number' ? sel.id : Number(sel.id);
  }
  return null;
}


  RemoveUsers() {
    this.ListeUserSelectionne = [];
  }

  ValiderDestinataire() {
    this.uiLock = true;

    const errorService = ErrorService.instance;
    this.action = $localize`Charger le template du mail`;
    this.etape = 'BROUILLON';
    this.ouvert_brouillon = true;
    this.ouvert_audience = false;

return     this.mail_serv.GetMail(this.typemail)
      .then(kvp => {
        this.subject_mail_a_generer = kvp.key;
        this.mail_a_generer = kvp.value;
      })
      .catch((err: HttpErrorResponse) => {
        const o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      }).finally(() => { this.uiLock = false; })
  }

  RemoveUser(user: Adherent_VM) {
    this.ListeUserSelectionne = this.ListeUserSelectionne.filter(x => x.id !== user.id);
  }

  GenererVue() {
    this.uiLock = true;

    const errorService = ErrorService.instance;
    this.action = $localize`Charger le contenu du mail`;
   
      this.ListeGeneree=  [];
      let userss = this.ListeUserSelectionne.map(x => x.id);
      if(this.envoi_par_compte){
         userss = [...new Set(this.ListeUserSelectionne.map(x => x.compte))];
      }
return     this.mail_serv.EnvoyerMail(this.mail_a_generer, this.subject_mail_a_generer, userss, this.variables, this.typemail, this.envoi_par_compte, true).then((mail:KeyValuePairAny[]) =>{
      mail.forEach(m =>{
        let P:Adherent_VM = m.key;
        let kvp = m.value;
        this.ListeGeneree.push({key:P, value:kvp})
      })
      this.adherent_generer_vue = this.ListeGeneree[0] ?? null;

   })
      .catch((err: HttpErrorResponse) => {
        const o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      }).finally(() => { this.uiLock = false; })

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
    this.uiLock = true;

    const errorService = ErrorService.instance;
    this.action = $localize`Sauvegarder le template`;
return     this.mail_serv.SauvegarderTemplate(
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
    }).finally(() => { this.uiLock = false; })
  }

  // ✅ Une seule étape visible: parfait pour la card scroller
  vue(thisvue: 'SELECTION_MAIL' | 'PARAMETRE' | 'AUDIENCE' | 'BROUILLON' | 'ENVOI'): boolean {
    return this.etape === thisvue;
  }

  AddSeanceTous() {    
    if(!this.seance_selectionnee) return;
     this.inscriptionserv.GetAllSeanceFull(this.seance_selectionnee.seance_id).then((res) => {
         res.forEach(p => {
        if (p?.person) {
          Object.setPrototypeOf(p.person, Personne_VM.prototype);
          // 2) (Optionnel) matérialiser la valeur pour la sérialisation / filtres ultérieurs
          // (p.person as any).libelle = p.person.libelle;
        }
           const adh = Object.assign(new Adherent_VM(), p.person);
if (!adh.inscriptionsSaison) adh.inscriptionsSaison = [];
if (!adh.inscriptionsSeance) adh.inscriptionsSeance = [];
if (adh.inscrit == null) adh.inscrit = false;
if (adh.photo === undefined) adh.photo = null;

this.ListeUserSelectionne.push(adh);
       })
      });
    }
  AddSeancePresent() {  if(!this.seance_selectionnee) return;
     this.inscriptionserv.GetAllSeanceFull(this.seance_selectionnee.seance_id).then((res) => {
         res.forEach(p => {
          if(p.statut_inscription === InscriptionStatus_VM.PRESENT){
        if (p?.person) {
          Object.setPrototypeOf(p.person, Personne_VM.prototype);
          // 2) (Optionnel) matérialiser la valeur pour la sérialisation / filtres ultérieurs
          // (p.person as any).libelle = p.person.libelle;
        }
           const adh = Object.assign(new Adherent_VM(), p.person);
if (!adh.inscriptionsSaison) adh.inscriptionsSaison = [];
if (!adh.inscriptionsSeance) adh.inscriptionsSeance = [];
if (adh.inscrit == null) adh.inscrit = false;
if (adh.photo === undefined) adh.photo = null;

this.ListeUserSelectionne.push(adh);
      } })
      });}
  AddSeanceConvoque() {  if(!this.seance_selectionnee) return;
     this.inscriptionserv.GetAllSeanceFull(this.seance_selectionnee.seance_id).then((res) => {
         res.forEach(p => {
          if(p.statut_inscription === InscriptionStatus_VM.CONVOQUE){
        if (p?.person) {
          Object.setPrototypeOf(p.person, Personne_VM.prototype);
          // 2) (Optionnel) matérialiser la valeur pour la sérialisation / filtres ultérieurs
          // (p.person as any).libelle = p.person.libelle;
        }
           const adh = Object.assign(new Adherent_VM(), p.person);
if (!adh.inscriptionsSaison) adh.inscriptionsSaison = [];
if (!adh.inscriptionsSeance) adh.inscriptionsSeance = [];
if (adh.inscrit == null) adh.inscrit = false;
if (adh.photo === undefined) adh.photo = null;

this.ListeUserSelectionne.push(adh);
      } })
      });}

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


 async EnvoyerTousLesMails() {
  this.uiLock = true;
  try {
    const total = this.ListeGeneree.length;
    let OK = 0;
    this.action = $localize`Envoyer les mails`;

    if (this.typemail === 'relance') {
      this.variables = { DATE_DEBUT: this.date_debut, DATE_FIN: this.date_fin };
    }

    let userss = this.ListeUserSelectionne.map(x => x.id);
    if (this.envoi_par_compte) {
      userss = [...new Set(this.ListeUserSelectionne.map(x => x.compte))];
    }

    // ⬇️ ATTEND la promesse
    const mail: KeyValuePairAny[] = await this.mail_serv.EnvoyerMail(
      this.mail_a_generer,
      this.subject_mail_a_generer,
      userss,
      this.variables,
      this.typemail,
      this.envoi_par_compte,
      false
    );

    this.log = '';
    for (const m of mail) {
      OK++;
      const nom = this.makeLabel(m.key);
      const sujet = m?.value?.key ?? '';
      this.log += `${nom} — ${sujet}\n`;
    }
    window.alert($localize`Nombre de mails envoyés : ` + OK + '/' + total + '\n' + this.log);

  } catch (err) {
    // gère l’erreur ici (et pas dans un .catch séparé)
    // ErrorService.instance.emitChange(...);
  } finally {
    this.uiLock = false;
    // Si ton composant est en OnPush :
  }
}

  makeLabel(p: any): string {
  if(this.envoi_par_compte){
    return p?? '';
  } else {
 const prenom = p?.prenom ?? p?.firstName ?? '';
  const nom    = p?.nom    ?? p?.lastName  ?? '';
  const age    = this.calculateAge(p?.date_naissance ?? p?.birthDate);
  return `${prenom} ${nom}${age ? ' ' + age + ' ans' : ''}`.trim();
  }
 
}


  EnvoiMail() {
    this.uiLock = true;

     const errorService = ErrorService.instance;
    this.action = $localize`Envoyer les mails`;
    if(this.typemail == 'relance'){
      this.variables = {
        DATE_DEBUT : this.date_debut,
        DATE_FIN: this.date_fin
      }
    }
    let userss = [this.adherent_generer_vue.key.id]
    if(this.envoi_par_compte){
      userss = [...new Set(this.ListeUserSelectionne.map(x => x.compte))];
    } 
return     this.mail_serv.EnvoyerMail(this.mail_a_generer, this.subject_mail_a_generer,userss , this.variables, this.typemail, this.envoi_par_compte, false).then((mail:KeyValuePairAny[]) =>{
      
      mail.forEach((m) =>{
      window.alert($localize`Mail envoyé`)
      })
      ;
   })
      .catch((err: HttpErrorResponse) => {
        const o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      }).finally(() => { this.uiLock = false; })
  }
}

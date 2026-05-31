import { Injectable } from '@angular/core';
import { AdherentListItem_VM } from '../vm/adherent-page.vm';
import { GeneratedMailVm, MailComposerVm, MailType } from '../vm/mail-composer.vm';
import { Groupe, LienGroupe_VM, Seance_VM } from '@shared/index';
import { environment } from '../environments/environment.prod';

@Injectable({ providedIn: 'root' })
export class MailComposerMapper {
 createInitialVm(saisonId: number): MailComposerVm {
  return {
    step: 'TYPE',
    loading: false,
    action: '',

    saisonId,

    mailType: null,
    audienceType: 'TOUS',

    dateDebut: '',
    dateFin: '',

    allSeances: [],
    seances: [],

    selectedSeance: null,
    serieSeances: [],
    sujetSerie: '',

    adherents: [],
    selectedAdherentIds: [],

    selectedGroupId: null,
    audienceSearch: '',

    templateSubject: '',
    templateHtml: '',

    generated: [],
    selectedGeneratedIndex: 0,

    paramsValidated: false,
    sendInfo: '',
  };
}

  getMailTypes(): { type: MailType; label: string; icon: string; description: string }[] {
    return [
      { type: 'relance', label: 'Séances disponibles', icon: 'fa-calendar-alt', description: 'Informer les adhérents des séances ouvertes.' },
      { type: 'annulation', label: 'Annulation séance', icon: 'fa-ban', description: 'Prévenir les participants d’une séance annulée.' },
      { type: 'convocation', label: 'Convocation', icon: 'fa-bullhorn', description: 'Envoyer une convocation à un événement.' },
      { type: 'bienvenue', label: 'Bienvenue', icon: 'fa-handshake', description: 'Envoyer un mail d’accueil.' },
      { type: 'serie_seance', label: 'Championnat', icon: 'fa-trophy', description: 'Composer un mail avec plusieurs séances.' },
      { type: 'vide', label: 'Message libre', icon: 'fa-pen', description: 'Partir d’un message vide.' },
    ];
  }

getEmails(adherent: AdherentListItem_VM): string[] {
  const contacts = (adherent.contact ?? [])
    .filter(c => c.Type === 'EMAIL' && c.Diffusion === true)
    .map(c => c.Value);
  return Array.from(
    new Set(
      [...contacts, adherent.login]
        .map(x => (x ?? '').toString().trim().toLowerCase())
        .filter(x => x.length > 0),
    ),
  );
}

buildGeneratedMails(
  adherent: AdherentListItem_VM,
  subjectTemplate: string,
  htmlTemplate: string,
  extra: Record<string, any>,
  mailType: MailType,
): GeneratedMailVm[] {
  const emails = this.getEmails(adherent);
  const baseContext = this.buildContext(adherent, extra, mailType);
  const loopRows = this.getLoopRows(adherent, extra, mailType);

  const subject = this.render(subjectTemplate, baseContext, loopRows);
  const html = this.render(htmlTemplate, baseContext, loopRows);

  if (!emails.length) {
    return [{
      adherent,
      to: { email: '', name: adherent.libelle ?? '' },
      subject,
      html,
      status: 'ERROR',
      error: 'Adresse mail manquante',
    }];
  }

  return emails.map(email => ({
    adherent,
    to: { email, name: extra['LIBELLE'] ?? adherent.libelle ?? '' },
    subject: this.render(subjectTemplate, { ...baseContext, EMAIL: email }, loopRows),
    html: this.render(htmlTemplate, { ...baseContext, EMAIL: email }, loopRows),
    status: 'READY',
  }));
}

render(
  template: string,
  context: Record<string, any>,
  loopRows: Record<string, any>[] = [],
): string {
  if (!template) return '';

  let rendered = template.replace(/\[\[([\s\S]*?)\]\]/g, (_m, block: string) => {
    return loopRows
      .map(row => this.replaceVars(block, { ...context, ...row }))
      .join('');
  });

  return this.replaceVars(rendered, context);
}

private replaceVars(text: string, context: Record<string, any>): string {
  return (text ?? '').replace(/{{\s*([^{}]+?)\s*}}/g, (_m, key: string) => {
    const value = this.resolve(context, key.trim());
    return value == null ? '' : String(value);
  });
}

private buildContext(
  adherent: AdherentListItem_VM,
  extra: Record<string, any>,
  mailType: MailType,
): Record<string, any> {
  const seance = extra['SEANCE'];

  return {
  ...extra,

  ID: adherent.id,
  NOM: adherent.nom ?? '',
  PRENOM: adherent.prenom ?? '',
  SURNOM: adherent.surnom ?? '',
  LIBELLE: adherent.libelle || [adherent.prenom, adherent.nom, adherent.surnom].filter(Boolean).join(' '),
  AGE: this.getAge(adherent.date_naissance),
  EMAIL: this.getEmails(adherent).join(', '),

  DATE_DEBUT: this.toDateFr(extra['DATE_DEBUT']),
  DATE_FIN: this.toDateFr(extra['DATE_FIN']),
  NOM_CHAMPIONNAT: extra['NOM_CHAMPIONNAT'] ?? '',

  SEANCE_ID: seance?.id ?? '',
  SEANCE_NOM: this.getSeanceLabel(seance),
  SEANCE: this.getSeanceLabel(seance),
  SEANCE_DATE: this.toDateFr(seance?.date_seance),
  SEANCE_DATE_ISO: this.toDateOnly(seance?.date_seance),

  MAIL_TYPE: mailType,
};
}

private getLoopRows(
  adherent: AdherentListItem_VM,
  extra: Record<string, any>,
  mailType: MailType,
): Record<string, any>[] {
  if (mailType === 'relance') {
    return this.getEligibleRelanceSeances(adherent, extra)
      .map(seance => this.seanceToLoopRow(seance, adherent));
  }

  if (mailType === 'serie_seance') {
    return ((extra['SEANCES'] ?? []) as Seance_VM[])
      .map(seance => this.seanceToLoopRow(seance, adherent));
  }

  if (mailType === 'annulation' || mailType === 'convocation') {
    const seance = extra['SEANCE'];
    return seance ? [this.seanceToLoopRow(seance, adherent)] : [];
  }

  return [];
}

private buildPresenceButton(
  seance: Seance_VM,
  adherent: AdherentListItem_VM,
  present: boolean,
): string {
  const url = this.buildPresenceLink(seance.id, adherent.id, present);
  const label = present ? 'Présent' : 'Absent';
  const icon = present ? '👍' : '👎';
  const cssClass = present ? 'yes' : 'no';

  return `
    <a
      href="${url}"
      class="icon-btn ${cssClass}"
      title="${label}"
      aria-label="${label}"
    >${icon}</a>
  `;
}

private buildPresenceLink(
  seanceId: number,
  adherentId: number,
  present: boolean,
): string {
  const params = new URLSearchParams({
    id: String(seanceId),
    adherent: String(adherentId),
    reponse: present ? '1' : '0',
  });

  return `${environment.frontUrl}/ma-seance?${params.toString()}`;
}

private getEligibleRelanceSeances(
  adherent: AdherentListItem_VM,
  extra: Record<string, any>,
): Seance_VM[] {
  const dateDebut = extra['DATE_DEBUT'] ?? '';
  const dateFin = extra['DATE_FIN'] ?? '';
  const seances = (extra['ALL_SEANCES'] as Seance_VM[])
    .filter(seance => this.isSeanceInDateRange(seance, dateDebut, dateFin))
    .filter(seance => this.isAdherentInSeanceGroup(adherent, seance))
    .filter(seance => this.isAdherentInAgeRange(adherent, seance));

  return seances.sort((a, b) =>
    this.toDateOnly(a.date_seance).localeCompare(this.toDateOnly(b.date_seance)),
  );
}

private isSeanceInDateRange(seance: Seance_VM, dateDebut: string, dateFin: string): boolean {
  const d = this.toDateOnly(seance.date_seance);
  if (!d) return false;

  return (!dateDebut || d >= dateDebut) && (!dateFin || d <= dateFin);
}

private isAdherentInSeanceGroup(
  adherent: AdherentListItem_VM,
  seance: Seance_VM,
): boolean {

  const adherentGroupIds = new Set(
    (adherent.groupesActifs ?? [])
      .map((g: LienGroupe_VM) => Number(g.id))
      .filter(id => Number.isFinite(id)),
  );

  const seanceGroupIds = ((seance.groupes ?? []) as Groupe[])
    .map((g: Groupe) => Number(g.id))
    .filter(id => Number.isFinite(id));

  // aucune restriction de groupe sur la séance
  if (!seanceGroupIds.length) {
    return true;
  }

  // au moins un groupe commun
  return seanceGroupIds.some(id => adherentGroupIds.has(id));
}
private isAdherentInAgeRange(adherent: AdherentListItem_VM, seance: Seance_VM): boolean {
  const age = this.getAge(adherent.date_naissance);
  if (age == null) return true;

  const min = seance.age_minimum ?? null;
  const max = seance.age_maximum ?? null;

  if (min != null && age < min) return false;
  if (max != null && age > max) return false;

  return true;
}

private seanceToLoopRow(
  seance: Seance_VM,
  adherent?: AdherentListItem_VM,
): Record<string, any> {
  return {
    ID: seance.id,

    SEANCE: this.getSeanceLabel(seance),
    SEANCE_ID: seance.id,
    SEANCE_NOM: this.getSeanceLabel(seance),

    NOM: this.getSeanceLabel(seance),

    DATE: this.toDateFr(seance.date_seance),
    DATE_SEANCE: this.toDateFr(seance.date_seance),
    DATE_SEANCE_ISO: this.toDateOnly(seance.date_seance),

    HEURE: seance.heure_debut ?? '',
    HEURE_DEBUT: seance.heure_debut ?? '',
    HEURE_FIN: seance.heure_fin ?? '',

    LIEU: this.getLieuLabel(seance),
    LIEU_NOM: this.getLieuLabel(seance),

    RDV: (seance as any).rdv ?? '',

    PRESENT: adherent ? this.buildPresenceButton(seance, adherent, true) : '',
    ABSENT: adherent ? this.buildPresenceButton(seance, adherent, false) : '',
    CONNEXION: '',
  };
}

private getSeanceLabel(seance: Seance_VM): string {
  if (!seance) return '';
  return seance.nom;
}

private getLieuLabel(seance: Seance_VM): string {
  return (
    seance?.lieu_nom 
  );
}

private getTime(seance: Seance_VM): string {
  const value =
    seance?.heure_debut ??
    null;

  if (!value) return '';

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  return d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

private getDuration(seance: Seance_VM): string {
  const minutes = seance?.duree_seance;
  if (minutes == null || Number.isNaN(minutes)) return '';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours}h${mins.toString().padStart(2, '0')}`;
}

private getAge(dateNaissance: Date): number | null {
  if (!dateNaissance) return null;

  const birth = new Date(dateNaissance);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();

  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}



private toDateOnly(value: string | Date | null | undefined): string {
  if (!value) return '';

  let d: Date | null = null;

  if (value instanceof Date) {
    d = value;
  } else if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }

    const fr = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (fr) {
      const [, dd, mm, yyyy] = fr;
      return `${yyyy}-${mm}-${dd}`;
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      d = parsed;
    }
  }

  if (!d || Number.isNaN(d.getTime())) return '';

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

private toDateFr(value: string | Date | null | undefined): string {
  const iso = this.toDateOnly(value);
  if (!iso) return '';

  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

private resolve(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

public isAdherentEligibleForSeance(adherent: AdherentListItem_VM, seance: Seance_VM): boolean {
  return (
    this.isAdherentInSeanceGroup(adherent, seance) &&
    this.isAdherentInAgeRange(adherent, seance)
  );
}

  

filterSeancesByDate(seances: Seance_VM[], dateDebut: string, dateFin: string): Seance_VM[] {

  return seances.filter(s => {
    const d = this.toDateOnly(s.date_seance);

    return (
      !!d &&
      (!dateDebut || d >= dateDebut) &&
      (!dateFin || d <= dateFin)
    );
  });
}
}
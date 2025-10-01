// messages/messages.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { MailerService } from '../mail/mailer.service';
import { Project } from '../../entities/projet.entity';
import { Session } from '../../entities/seance.entity';
import { Person } from '../../entities/personne.entity';
import { MailInput } from '@shared/lib/mail-input.interface';
import { MailProject } from '../../entities/mail-project.entity';
import { Account } from '../../entities/compte.entity';
import { ConfigService } from '@nestjs/config';
import { KeyValuePairAny } from '@shared/lib/autres.interface';
import { calculateAge } from '../member/member.services';
import { RegistrationSeason } from '../../entities/inscription-saison.entity';
import { LinkGroupService } from '../../crud/linkgroup.service';
import { SessionService } from '../../crud/session.service';
import { SeanceService, to_Seance_VM } from '../seance/seance.services';
import { Seance_VM } from '@shared/lib/seance.interface';

@Injectable()
export class MessagesService {
  constructor(
      private readonly configService: ConfigService,
    private readonly mailer: MailerService,
    private readonly linkgroup_serv:LinkGroupService, 
    private readonly seanceService:SeanceService, 
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    @InjectRepository(Person)  private readonly personRepo: Repository<Person>,
    @InjectRepository(Account)  private readonly accountrepo: Repository<Account>,
    @InjectRepository(RegistrationSeason)  private readonly regsarepo: Repository<RegistrationSeason>,
    @InjectRepository(MailProject) private readonly mailProjectRepo: Repository<MailProject>
  ) {}

async GetMail(type: 'convocation' | 'annulation' | 'relance' | 'libre' | 'serie_seance' | 'bienvenue', id: number): Promise<KeyValuePairAny> {
  const proj = await this.mailProjectRepo.findOne({ where: { id } });
  if (!proj) throw new Error('Mail project introuvable');

  if (type === 'convocation') {
    return { key: proj.sujet_convocation ?? '', value: proj.mail_convocation ?? '' };
  }
    if (type === 'relance') {
    return { key: proj.sujet_relance ?? '', value: proj.mail_relance ?? '' };
  }
   if (type === 'serie_seance') {
    return { key: proj.sujet_serie_seance ?? '', value: proj.mail_serie_seance ?? '' };
  }
   if (type === 'bienvenue') {
    return { key: proj.sujet_bienvenue ?? '', value: proj.mail_bienvenue ?? '' };
  }
     if (type === 'libre') {
    return { key: '', value: proj.mail_vide ?? '' };
  }
  // annulation par défaut
  return { key: proj.sujet_annulation ?? '', value: proj.mail_annulation ?? '' };
}

async Update(template:string, subject:string, type: 'convocation' | 'annulation' | 'relance' | 'libre' | 'essai', id: number): Promise<UpdateResult> {
  const proj = await this.mailProjectRepo.findOne({ where: { id } });
  if (!proj) throw new Error('Mail project introuvable');

  if (type === 'convocation') {
   proj.mail_convocation = template;
   proj.sujet_convocation = subject;
  }
    if (type === 'annulation') {
   proj.mail_annulation = template;
   proj.sujet_annulation = subject;
  }
    if (type === 'essai') {
   proj.mail_essai = template;
   proj.sujet_essai = subject;
  }
    if (type === 'relance') {
   proj.mail_relance = template;
   proj.sujet_relance = subject;
  }
     if (type === 'libre') {
   proj.mail_vide = template;
  }
  // annulation par défaut
  return this.mailProjectRepo.update({ id },proj);
}

  // Exemple : convocation à une séance
  async MailEssai(sessionId: number, personId: number, projectId: number) {
    const [s, p, proj, templatemail] = await Promise.all([
      this.sessionRepo.findOne({
    where: { id: sessionId },
    relations: [
      'location'
    ],
  }),
      this.personRepo.findOne({
    where: { id: personId },
    relations: [
      'account'
    ],
  }),
      this.projectRepo.findOneByOrFail({ id: projectId }),
      this.mailProjectRepo.findOneByOrFail({ id: projectId })
    ]);

    let subject = templatemail.sujet_essai;
    let html = templatemail.mail_essai;

    const dataEssai = {
  SEANCE: s?.label ?? 'séance',
  DATE: formatDDMMYYYY(s?.date),
  ID: sessionId,
  NOM_ADHERENT: `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim(),
  LIEU: s?.location?.name ?? 'lieu non défini',
  HEURE: s?.startTime ?? 'heure non définie',
  DUREE: (s?.duration != null) ? `${s.duration} min` : 'durée non définie',
};

subject = fillTemplate(templatemail.sujet_essai, dataEssai);
html    = fillTemplate(templatemail.mail_essai,  dataEssai);


    const msg: MailInput = {
      to: [p?.account.login || '',proj.login],
      subject,
      html
    };

    // nom+email expéditeur affiché (ou laisse vide pour fallback .env)
    return this.mailer.queue(msg, proj.login, proj.name, projectId);
  }

  async MailActivation(login: string) {
    const p = await this.accountrepo.findOne({   where: { login } });
      let activationTmpl = `<h2>Activation de votre compte</h2> <p>Bonjour {{LOGIN}},</p> <p>Veuillez cliquer sur le lien ci-dessous pour activer votre compte :</p><p><a href='${this.configService.get<string>('FRONT_URL')}/login?context=ACTIVATE&user={{LOGIN}}&token={{TOKEN}}'>Activer mon compte</a></p><p>Merci,</p><p>L'équipe AsSolutions</p>`;

  let subject = "Activation de votre compte AsSolutions";
    if(p.isActive && p.activationToken == null) {
activationTmpl = "<h2>Ouverture d'un compte</h2> <p>Bonjour {{LOGIN}},</p> <p>Vous avez créé un compte sur AsSolutions.</p><p>Vous pouvez vous connecter en utilisant votre adresse email comme identifiant et le mot de passe que vous avez choisi.</p><p>Merci,</p><p>L'équipe AsSolutions</p>";
subject = "Compte AsSolutions";  
} else {
      if(!p.activationToken) {
        p.activationToken = Math.random().toString(36).substring(2);
        await this.accountrepo.save(p);
      }

    }
    const dataAct = {
  LOGIN: p?.login ?? 'utilisateur',
  TOKEN: p?.activationToken ?? 'token non défini',
};
const html = fillTemplate(activationTmpl, dataAct);

    const msg: MailInput = {
      to: p?.login || '',
      subject,
      html
    };
    return this.mailer.queue(msg, "assolutions.club@gmail.com", "AsSolutions");
  }

  async mail_convoc_annulation(type:string, destinataire:number[],notes:string, sessionId:number, projectId:number){
    
        const [s,  proj, templatemail] = await Promise.all([
      this.sessionRepo.findOne({
    where: { id: sessionId },
    relations: [
      'location'
    ],
  }),

      this.projectRepo.findOneByOrFail({ id: projectId }),
      this.mailProjectRepo.findOneByOrFail({ id: projectId })
    ]);

    let subject = templatemail.sujet_annulation;
    let html = templatemail.mail_annulation;
    if(type==="convocation"){
      subject = templatemail.sujet_convocation;
      html = templatemail.mail_convocation;
    }
    destinataire.forEach(async (id) =>{
 
 let p = await this.personRepo.findOne({
    where: { id },
    relations: [
      'account'
    ],
  })
     const dataEssai = {
  SEANCE: s?.label ?? 'séance',
  SEANCE_ID: s?.id ?? 0,
  PERSONNE_ID: p?.id ?? 0,
  DATE: formatDDMMYYYY(s?.date),
  ID: sessionId,
  NOM: `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim(),
  LIEU: s?.location?.name ?? 'lieu non défini',
  HEURE: s?.startTime ?? 'heure non définie',
  RDV: s?.appointment ?? '',
  DUREE: (s?.duration != null) ? `${s.duration} min` : 'durée non définie',
  NOTES: notes
};
subject = fillTemplate(subject, dataEssai);
html    = fillTemplate(html,  dataEssai);


    const msg: MailInput = {
      to: [p?.account.login || '',proj.login],
      subject,
      html
    };

    // nom+email expéditeur affiché (ou laisse vide pour fallback .env)
    return this.mailer.queue(msg, proj.login, proj.name, projectId);
    })
 


  }

async mail_relance(
  template: string,
  subject: string,
  destinataire: number[],
  variables: Record<string, any>,
  type_mail: 'convocation' | 'annulation' | 'relance' | 'libre' | 'essai' | 'serie_seance' | 'bienvenue',
  envoi_par_compte: boolean,
  simuler: boolean,
  projectId: number
): Promise<KeyValuePairAny[]> {
  // 1) Charger le projet + saison active
  const proj = await this.projectRepo.findOne({
    where: { id: projectId },
    relations: ['seasons'],
  });
  if (!proj) throw new Error(`Projet ${projectId} introuvable`);
  const activeSeason = proj.seasons?.find(s => (s as any)?.isActive);
  if (!activeSeason) throw new Error(`Aucune saison active pour le projet ${projectId}`);

  const results: KeyValuePairAny[] = [];


  switch (type_mail) {
    case 'convocation': 
    case 'annulation':
    const idseance_con = variables?.SEANCE_ID;
    if(!idseance_con) throw new Error('SEANCE_ID manquant dans variables');
    const s = await this.seanceService.Get(idseance_con);
  for (const id of destinataire) {
    try {
    // Filtrer les destinataires pour n'avoir que les personnes avec un compte (login non vide)
        const p = await this.personRepo.findOne({
        where: { id },
        relations: ['account', 'inscriptions'],
      });
      if (!p) continue;
      if (!p.account?.login || p.account.login.trim().length === 0) continue;
     const dataSeance = {
            SEANCE: s.libelle ?? 'séance',
            SEANCE_ID: s.seance_id ?? 0,
            PERSONNE_ID: p?.id ?? 0,
            DATE: formatDDMMYYYY(s.date_seance),
            LIEU: s.lieu_nom ?? 'lieu non défini',
            HEURE: s.heure_debut ?? 'heure non définie',
            RDV: s.rdv ?? '',
            DUREE: (s.duree_seance != null) ? `${s.duree_seance} min` : 'durée non définie',
             LOGIN: p.account?.login ?? '',
        NOM: `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim(),
     }
     const subjectFilled = fillTemplate(subject, dataSeance);
     const htmlFilled = fillTemplate(template, dataSeance);
      const to = [p.account?.login, proj.login].filter((x): x is string => !!x && x.trim().length > 0);
      if (!simuler) {
        const msg: MailInput = { to, subject: subjectFilled, html: htmlFilled };
        await this.mailer.queue(msg, proj.login, proj.name, projectId);
      }

      results.push({ key: p, value:{ key: subjectFilled, value: htmlFilled }});
    } catch {
      // silencieux comme dans ton exemple
    }
  }
    break;
      case 'serie_seance':
        const { outer: outerTemplate_serie, loop: loopTemplate_serie } = parseLoop(template);
    const ids = variables?.SERIE_SEANCE;
    if(!idseance_con) throw new Error('SERIE_SEANCE manquant dans variables');
    let liste_seance: Seance_VM[] = [];
    ids.forEach(async (id: number) => {
      const seance = await this.seanceService.Get(id);
      if(seance) liste_seance.push(seance);
    });
    if(liste_seance.length === 0) throw new Error('Aucune séance trouvée pour les IDs fournis dans SERIE_SEANCE');
    // Utiliser la première séance pour les données communes
   for (const id of destinataire) {
    try {
    // Filtrer les destinataires pour n'avoir que les personnes avec un compte (login non vide)
        const p = await this.personRepo.findOne({
        where: { id },
        relations: ['account', 'inscriptions'],
      });
      if (!p) continue;

  // Dates borne issues des variables (obligatoires d’après ta note)
  // Accepte string | Date ; normalise en début/fin de journée.

     // 4) Variables globales pour remplir {{ ... }} (inclut les bornes)
      const info = {
        LOGIN: p.account?.login ?? '',
        NOM: `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim(),
      };

      const subjectFilled = fillTemplate(subject, info);
      let htmlOuter = fillTemplate(outerTemplate_serie, info); // partie autour, sans la boucle encore

      // 5) Données de la boucle [[ ... ]] (séances)
      const age = calculateAge(p.birthDate);
      const groupes = (await this.linkgroup_serv.getGroupsForObject('rider', id, activeSeason.id))
        ?.map((x: any) => x.groupId) ?? [];

     

      // -- Filtrer entre DATE_DEBUT et DATE_FIN (inclusif) + trier par date
      liste_seance = (liste_seance ?? [])
        .filter((s: any) => {
          const d = parseDateStrict(s?.seance?.date_seance);
          return d != null && d >= dateDebut && d <= dateFin;
        })
        .sort((a: any, b: any) => {
          const da = parseDateStrict(a?.seance?.date_seance)?.getTime() ?? 0;
          const db = parseDateStrict(b?.seance?.date_seance)?.getTime() ?? 0;
          return da - db;
        });

      const boucleContent = liste_seance
        .map((s: any) => {
           const seanceId = s?.seance?.seance_id ?? 0;
  const login = encodeURIComponent(p.account?.login ?? '');
  const adherentId = p?.id ?? 0;

  const dataSeance_serie = {
    SEANCE: s?.seance?.libelle ?? 'séance',
    SEANCE_ID: seanceId,
    PERSONNE_ID: adherentId,
    DATE: formatDDMMYYYY(s?.seance?.date_seance),
    LIEU: s?.seance?.lieu_nom ?? 'lieu non défini',
    HEURE: s?.seance?.heure_debut ?? 'heure non définie',
    RDV: s?.seance?.rdv ?? '',
    DUREE: (s?.seance?.duree_seance != null) ? `${s.seance.duree_seance} min` : 'durée non définie',

    // Icônes seules (multilingue) + classes pour matching avec le CSS de l’email
    PRESENT: `<a class="icon-btn yes" href="https://assolutions.club/ma-seance?id=${seanceId}&reponse=1&login=${login}&adherent=${adherentId}" target="_blank" rel="noopener" title="RSVP yes" aria-label="RSVP yes">👍</a>`,
    ABSENT:  `<a class="icon-btn no" href="https://assolutions.club/ma-seance?id=${seanceId}&reponse=0&login=${login}&adherent=${adherentId}" target="_blank" rel="noopener" title="RSVP no" aria-label="RSVP no">👎</a>`,
  };

  return fillTemplate(loopTemplate_serie, dataSeance_serie);
})
.join('');

      // 6) Réintégrer la boucle
      const finalHtml = replaceLoopPlaceholder(htmlOuter, boucleContent);

      // 7) Envoi (ou simulation)
      const to = [p.account?.login, proj.login].filter((x): x is string => !!x && x.trim().length > 0);
      if (!simuler) {
        const msg: MailInput = { to, subject: subjectFilled, html: finalHtml };
        await this.mailer.queue(msg, proj.login, proj.name, projectId);
      }

      results.push({ key: p, value:{ key: subjectFilled, value: finalHtml }});

    } catch {
      // silencieux comme dans ton exemple
    }
  }
    break;
    case 'relance':
        const { outer: outerTemplate, loop: loopTemplate } = parseLoop(template); // outer => avec "[[]]" comme placeholder
          const dateDebutRaw = variables?.DATE_DEBUT;
  const dateFinRaw   = variables?.DATE_FIN;
  const dateDebut = toStartOfDay(parseDateStrict(dateDebutRaw));
  const dateFin   = toEndOfDay(parseDateStrict(dateFinRaw));
  console.log('Date début:', dateDebut, 'Date fin:', dateFin);
  console.log("date", dateDebutRaw, dateFinRaw);
  if (!dateDebut || !dateFin) {
    throw new Error('DATE_DEBUT ou DATE_FIN invalide(s) dans variables');
  }
 for (const id of destinataire) {
    try {
    // Filtrer les destinataires pour n'avoir que les personnes avec un compte (login non vide)
        const p = await this.personRepo.findOne({
        where: { id },
        relations: ['account', 'inscriptions'],
      });
      if (!p) continue;

  // Dates borne issues des variables (obligatoires d’après ta note)
  // Accepte string | Date ; normalise en début/fin de journée.

     // 4) Variables globales pour remplir {{ ... }} (inclut les bornes)
      const info = {
        DATE_DEBUT: dateDebut,
        DATE_FIN:dateFin,
        LOGIN: p.account?.login ?? '',
        NOM: `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim(),
      };

      const subjectFilled = fillTemplate(subject, info);
      let htmlOuter = fillTemplate(outerTemplate, info); // partie autour, sans la boucle encore

      // 5) Données de la boucle [[ ... ]] (séances)
      const age = calculateAge(p.birthDate);
      const groupes = (await this.linkgroup_serv.getGroupsForObject('rider', id, activeSeason.id))
        ?.map((x: any) => x.groupId) ?? [];

      let mes_seances = await this.seanceService.MySeance(
        p.id,
        age,
        activeSeason.id,
        groupes
      );

      // -- Filtrer entre DATE_DEBUT et DATE_FIN (inclusif) + trier par date
      mes_seances = (mes_seances ?? [])
        .filter((s: any) => {
          const d = parseDateStrict(s?.seance?.date_seance);
          return d != null && d >= dateDebut && d <= dateFin;
        })
        .sort((a: any, b: any) => {
          const da = parseDateStrict(a?.seance?.date_seance)?.getTime() ?? 0;
          const db = parseDateStrict(b?.seance?.date_seance)?.getTime() ?? 0;
          return da - db;
        });

      const boucleContent = mes_seances
        .map((s: any) => {
           const seanceId = s?.seance?.seance_id ?? 0;
  const login = encodeURIComponent(p.account?.login ?? '');
  const adherentId = p?.id ?? 0;

  const dataSeance = {
    SEANCE: s?.seance?.libelle ?? 'séance',
    SEANCE_ID: seanceId,
    PERSONNE_ID: adherentId,
    DATE: formatDDMMYYYY(s?.seance?.date_seance),
    LIEU: s?.seance?.lieu_nom ?? 'lieu non défini',
    HEURE: s?.seance?.heure_debut ?? 'heure non définie',
    RDV: s?.seance?.rdv ?? '',
    DUREE: (s?.seance?.duree_seance != null) ? `${s.seance.duree_seance} min` : 'durée non définie',

    // Icônes seules (multilingue) + classes pour matching avec le CSS de l’email
    PRESENT: `<a class="icon-btn yes" href="https://assolutions.club/ma-seance?id=${seanceId}&reponse=1&login=${login}&adherent=${adherentId}" target="_blank" rel="noopener" title="RSVP yes" aria-label="RSVP yes">👍</a>`,
    ABSENT:  `<a class="icon-btn no" href="https://assolutions.club/ma-seance?id=${seanceId}&reponse=0&login=${login}&adherent=${adherentId}" target="_blank" rel="noopener" title="RSVP no" aria-label="RSVP no">👎</a>`,
  };

  return fillTemplate(loopTemplate, dataSeance);
})
.join('');

      // 6) Réintégrer la boucle
      const finalHtml = replaceLoopPlaceholder(htmlOuter, boucleContent);

      // 7) Envoi (ou simulation)
      const to = [p.account?.login, proj.login].filter((x): x is string => !!x && x.trim().length > 0);
      if (!simuler) {
        const msg: MailInput = { to, subject: subjectFilled, html: finalHtml };
        await this.mailer.queue(msg, proj.login, proj.name, projectId);
      }

      results.push({ key: p, value:{ key: subjectFilled, value: finalHtml }});

    } catch {
      // silencieux comme dans ton exemple
    }
  }
    break;
    case 'libre':
      case 'bienvenue':
  if(!envoi_par_compte){
      for (const id of destinataire) {
    try {
    // Filtrer les destinataires pour n'avoir que les personnes avec un compte (login non vide)
        const p = await this.personRepo.findOne({
        where: { id },
        relations: ['account', 'inscriptions'],
      });
      if (!p) continue;
      if (!p.account?.login || p.account.login.trim().length === 0) continue;
     const dataSeance = {
            PERSONNE_ID: p?.id ?? 0,
             LOGIN: p.account?.login ?? '',
        NOM: `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim(),
     }
      const subjectFilled = fillTemplate(subject, dataSeance);
     const htmlFilled = fillTemplate(template, dataSeance);
      const to = [p.account?.login, proj.login].filter((x): x is string => !!x && x.trim().length > 0);
      if (!simuler) {
        const msg: MailInput = { to, subject: subjectFilled, html: htmlFilled };
        await this.mailer.queue(msg, proj.login, proj.name, projectId);
      }

      results.push({ key: p, value:{ key: subjectFilled, value: htmlFilled }});
    }  catch {

  }
}     
  } else {
          for (const id of destinataire) {
    try {
    // Filtrer les destinataires pour n'avoir que les personnes avec un compte (login non vide)
        const ac = await this.accountrepo.findOne({
        where: { id }
      });
      if (!ac) continue;
      if (!ac.login || ac.login.trim().length === 0) continue;
     const dataSeance = {
             LOGIN: ac.login ?? '',
     }
      const subjectFilled = fillTemplate(subject, dataSeance);
     const htmlFilled = fillTemplate(template, dataSeance);
      const to = [ac.login, proj.login].filter((x): x is string => !!x && x.trim().length > 0);
      if (!simuler) {
        const msg: MailInput = { to, subject: subjectFilled, html: htmlFilled };
        await this.mailer.queue(msg, proj.login, proj.name, projectId);
      }

      results.push({ key: ac.login, value:{ key: subjectFilled, value: htmlFilled }});
    }  catch {
  }
  }
}
    break;
  }


  return results;
}




   

  // Exemple très générique : envoi “brut” (tu fournis déjà le contenu)
  async sendRaw(input: MailInput, fromEmail: string, fromName: string, projectId: number | null = null) {
    return this.mailer.queue(input, fromEmail, fromName, projectId);
  }
  
}
function parseDateStrict(d: unknown): Date | null {
  if (d == null) return null;

  // Déjà une Date valide ?
  if (d instanceof Date && !isNaN(d.getTime())) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // Chaîne ?
  const s = typeof d === 'string' ? d.trim() : '';
  if (!s) return null;

  // 1) YYYY-MM-DD
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const [, y, mm, dd] = m;
    const Y = +y, M = +mm, D = +dd;
    const dt = new Date(Y, M - 1, D);
    return (dt.getFullYear() === Y && dt.getMonth() === M - 1 && dt.getDate() === D) ? dt : null;
  }

  // 2) dd/MM/yyyy ou dd-MM-yyyy
  m = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(s);
  if (m) {
    const [, dd, mm, y] = m;
    const D = +dd, M = +mm, Y = +y;
    const dt = new Date(Y, M - 1, D);
    return (dt.getFullYear() === Y && dt.getMonth() === M - 1 && dt.getDate() === D) ? dt : null;
  }

  // 3) Dernière chance : parsers natifs (ISO, RFC…)
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

function toStartOfDay(d: Date | null): Date | null {
  if (!d) return null;
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setHours(0, 0, 0, 0);
  return x;
}
function toEndOfDay(d: Date | null): Date | null {
  if (!d) return null;
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setHours(23, 59, 59, 999);
  return x;
}

function toDateSafe(input: unknown): Date | null {
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

function formatDDMMYYYY(input: unknown): string {
  const d = toDateSafe(input);
  if (!d) return ''; // ou retourne '??/??/????'
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function normalizeTemplate(tmpl: string): string {
  if (!tmpl) return '';
  // Accolades fullwidth -> ASCII, supprime NBSP & zero-width
  return tmpl
    .replace(/\uFF5B/g, '{')  // ｛
    .replace(/\uFF5D/g, '}')  // ｝
    .replace(/\u00A0/g, ' ')  // NBSP
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // zero-width
}



function parseLoop(tpl: string): { outer: string; loop: string } {
  // Prend la première occurrence [[ ... ]] (dotall)
  const re = /\[\[(.*?)\]\]/s;
  const m = re.exec(tpl);
  if (!m) {
    // pas de boucle => outer = tpl, loop = ''
    return { outer: tpl, loop: '' };
  }
  const loop = m[1] ?? '';
  // Remplacer la première occurrence par un placeholder canonique "[[]]"
  const outer = tpl.replace(re, '[[]]');
  return { outer, loop };
}

function replaceLoopPlaceholder(outer: string, content: string): string {
  return outer.replace('[[]]', content ?? '');
}

function fillTemplate(text: string, data: Record<string, any>): string {
  if (!text) return '';
  return text.replace(/{{\s*([^{}]+?)\s*}}/g, (_match, keyRaw: string) => {
    const key = String(keyRaw || '').trim();
    const val = getPath(data, key);
    if (val === null || val === undefined) return '';
    if (val instanceof Date) return formatDDMMYYYY(val);
    return String(val);
  });
}

// Supporte des clés simples ou en "chemin" (ex: user.name, seance.date)
function getPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  if (!path.includes('.')) return obj[path];
  return path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}





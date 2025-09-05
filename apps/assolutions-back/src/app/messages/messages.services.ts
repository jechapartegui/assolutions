// messages/messages.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailerService } from '../mail/mailer.service';
import { Project } from '../../entities/projet.entity';
import { Session } from '../../entities/seance.entity';
import { Person } from '../../entities/personne.entity';
import { MailInput } from '@shared/lib/mail-input.interface';
import { MailProject } from '../../entities/mail-project.entity';
import { Account } from '../../entities/compte.entity';
import { ConfigService } from '@nestjs/config';
import { KeyValuePairAny } from '@shared/lib/autres.interface';

@Injectable()
export class MessagesService {
  constructor(
      private readonly configService: ConfigService,
    private readonly mailer: MailerService,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    @InjectRepository(Person)  private readonly personRepo: Repository<Person>,
    @InjectRepository(Account)  private readonly accountrepo: Repository<Account>,
    @InjectRepository(MailProject) private readonly mailProjectRepo: Repository<MailProject>
  ) {}

async GetMail(type: 'convocation' | 'annulation', id: number): Promise<KeyValuePairAny> {
  const proj = await this.mailProjectRepo.findOne({ where: { id } });
  if (!proj) throw new Error('Mail project introuvable');

  if (type === 'convocation') {
    return { key: proj.sujet_convocation ?? '', value: proj.mail_convocation ?? '' };
  }
  // annulation par défaut
  return { key: proj.sujet_annulation ?? '', value: proj.mail_annulation ?? '' };
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

  // Exemple très générique : envoi “brut” (tu fournis déjà le contenu)
  async sendRaw(input: MailInput, fromEmail: string, fromName: string, projectId: number | null = null) {
    return this.mailer.queue(input, fromEmail, fromName, projectId);
  }
  
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

function fillTemplate(tmpl: string, data: Record<string, unknown>): string {
  const norm = normalizeTemplate(tmpl);
  return norm.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (m, key) => {
    const v = data[key];
    return (v === null || v === undefined) ? m : String(v);
  });
}


import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { CalendrierService } from './calendrier.service';
import { GoogleCalendrierClient } from './google-calendrier.client';

/** Convertit une heure locale IANA en instant UTC ; rejette une heure DST inexistante. */
function instantLocal(date: string, heure: string, timezone: string): Date {
  const value = String(heure).slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(value)) throw new BadRequestException('CALENDAR_TIME_INVALID');
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  const [h, minute] = value.split(':').map(Number);
  const wallUtc = Date.UTC(y, m - 1, d, h, minute);
  const parser = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const zonedParts = (millis: number) => {
    const parts = Object.fromEntries(parser.formatToParts(new Date(millis))
      .filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]));
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  };
  // Approximation affine + correction pour le decalage saisonnier.
  let epoch = wallUtc;
  for (let i = 0; i < 3; i++) {
    const offset = zonedParts(epoch) - Math.floor(epoch / 60000) * 60000;
    epoch = wallUtc - offset;
  }
  if (zonedParts(epoch) !== wallUtc) {
    throw new BadRequestException('CALENDAR_DST_NONEXISTENT_LOCAL_TIME');
  }
  return new Date(epoch);
}

@Injectable()
export class CalendrierSyncService {
  private readonly logger = new Logger(CalendrierSyncService.name);
  constructor(
    private readonly db: DataSource,
    private readonly calendars: CalendrierService,
    private readonly google: GoogleCalendrierClient,
  ) {}

  private async invitees(calendrierId: number, projectId: number) {
    const rows: Array<{ id: number; login: string }> = await this.db.query(
      `SELECT DISTINCT co.id, co.login FROM compte co
       JOIN personne p ON p.compte = co.id AND COALESCE(p.archive, false) = false
       JOIN lien_groupe lg ON lg.object_type = 'rider' AND lg.object_id = p.id
       JOIN calendrier_groupe cg ON cg.groupe_id = lg.groupe_id AND cg.calendrier_id = $1
       JOIN login_project lp ON lp.login_id = co.id AND lp.project_id = $2
       WHERE co.actif = true ORDER BY co.id`, [calendrierId, projectId],
    );
    const projectRows = await this.db.query(
      `SELECT pr.contact, co.login AS owner_mail FROM project pr
       LEFT JOIN compte co ON co.id = pr.compte WHERE pr.id = $1`, [projectId],
    );
    const contact = projectRows[0]?.contact;
    const projectEmails = [projectRows[0]?.owner_mail, contact?.email, contact?.mail]
      .filter((x) => typeof x === 'string' && x.includes('@'));
    const emails = [
      this.google.owner, ...rows.map((r) => this.google.recipient(r.login, r.id)),
      ...projectEmails.map((x: string) => this.google.recipient(x)),
    ];
    return [...new Set(emails.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))];
  }

  private async eventBody(
    seanceId: number, calendrier: any, invitees: string[],
  ) {
    const rows = await this.db.query(
      `SELECT se.*, l.nom AS lieu_nom, l.adresse AS lieu_adresse,
         COALESCE((SELECT string_agg(DISTINCT g.nom, ', ' ORDER BY g.nom)
          FROM lien_groupe lg JOIN groupes g ON g.id = lg.groupe_id
          WHERE lg.object_type = 'séance' AND lg.object_id = se.seance_id), '') AS groupes
       FROM seance se LEFT JOIN lieu l ON l.id = se.lieu_id
       WHERE se.seance_id = $1 AND se.calendrier_id = $2 AND se.saison_id = $3`,
      [seanceId, calendrier.id, calendrier.saison_id],
    );
    if (!rows.length) throw new NotFoundException('SEANCE_NOT_IN_CALENDAR');
    const seance = rows[0];
    const date = typeof seance.date_seance === 'string'
      ? seance.date_seance.slice(0, 10)
      : new Date(seance.date_seance).toISOString().slice(0, 10);
    const start = instantLocal(date, seance.heure_debut, calendrier.timezone);
    const end = new Date(start.getTime() + Number(seance.duree_seance) * 60_000);
    if (Number(seance.duree_seance) <= 0) throw new BadRequestException('SEANCE_DURATION_INVALID');

    const site = (process.env.ASSOLUTIONS_FRONT_URL || (
      this.google.isProduction() ? 'https://assolutions.club' : ''
    )).replace(/\/$/, '');
    const description = [
      seance.type_seance + (seance.groupes ? ' — ' + seance.groupes : ''),
      seance.statut ? 'Statut : ' + seance.statut : '',
      seance.appointment ? 'Rendez-vous : ' + seance.appointment : '',
      seance.info_seance ? 'Informations : ' + seance.info_seance : '',
      '',
      'Agenda informatif uniquement. Assolutions fait foi.',
      'La presence, les absences et les convocations se gerent EXCLUSIVEMENT dans Assolutions.',
      // Pas de token personnel Oui/Non dans une description visible de TOUS les invites.
      site ? 'Consulter Assolutions : ' + site + '/ma-seance?id=' + seanceId : '',
    ].filter(Boolean).join('\n');

    return {
      summary: (seance.label || seance.type_seance || 'Séance') + (seance.groupes ? ' — ' + seance.groupes : ''),
      description,
      location: [seance.lieu_nom, seance.lieu_adresse].filter(Boolean).join(' — '),
      start: { dateTime: start.toISOString(), timeZone: calendrier.timezone },
      end: { dateTime: end.toISOString(), timeZone: calendrier.timezone },
      attendees: invitees.map((email) => ({ email })),
      guestsCanInviteOthers: false,
      guestsCanModify: false,
      guestsCanSeeOtherGuests: false,
      extendedProperties: { private: { source: 'assolutions', seance_id: String(seanceId) } },
    };
  }

  async sync(id: number, projectId: number, notifier = false) {
    if (!this.google.enabled) {
      throw new BadRequestException('GOOGLE_CALENDAR_DISABLED');
    }
    const calendrier = await this.calendars.get(id, projectId);
    if (!calendrier.actif) throw new BadRequestException('CALENDAR_ARCHIVED');
    // Refuser un owner OAuth differant avant toute creation d'agenda.
    await this.google.verifyOwner();
    const notify = notifier === true && calendrier.notifier_mises_a_jour === true;
    let googleId = calendrier.google_calendar_id as string | null;
    if (!googleId) {
      const created = await this.google.createCalendar(
        calendrier.nom, calendrier.description, calendrier.timezone,
      );
      googleId = created.id;
      await this.db.query(
        `UPDATE calendrier SET google_calendar_id=$2, google_calendar_url=$3,
         statut_synchro='PENDING', date_maj=now() WHERE id=$1 AND project_id=$4`,
        [id, googleId, created.url, projectId],
      );
    } else {
      await this.google.updateCalendar(
        googleId, calendrier.nom, calendrier.description, calendrier.timezone,
      );
    }
    const invitees = await this.invitees(id, projectId);
    // Une tranche par appel limite les quotas et les envois de masse involontaires.
    await this.db.query(
      `INSERT INTO calendrier_evenement (calendrier_id, seance_id, statut_synchro)
       SELECT $1, seance_id, 'PENDING' FROM seance WHERE calendrier_id = $1
       ON CONFLICT (calendrier_id, seance_id) DO NOTHING`, [id],
    );
    const rows: Array<{ id: number; seance_id: number | null; google_event_id: string | null;
      contenu_hash: string | null; statut_synchro: string }> = await this.db.query(
      `SELECT ce.* FROM calendrier_evenement ce WHERE ce.calendrier_id = $1
       AND (ce.statut_synchro IN ('PENDING', 'ERROR', 'DELETE_PENDING', 'SYNCING')
          OR ce.contenu_hash IS NULL)
       ORDER BY (ce.statut_synchro = 'DELETE_PENDING') DESC, ce.id LIMIT 100`, [id],
    );
    let success = 0, errors = 0;
    for (const row of rows) {
      try {
        const isRemoval = row.statut_synchro === 'DELETE_PENDING' || row.seance_id == null;
        if (isRemoval) {
          if (row.google_event_id) await this.google.deleteEvent(googleId, row.google_event_id, notify);
          await this.db.query(
            `UPDATE calendrier_evenement SET statut_synchro='DELETED',
             derniere_synchro=now(), derniere_erreur=NULL, date_maj=now()
             WHERE id=$1`, [row.id],
          );
          success++;
          continue;
        }
        const body = await this.eventBody(row.seance_id, calendrier, invitees);
        const contentHash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
        const eventId = row.google_event_id ||
          ('assol' + Number(id).toString(32) + 's' + Number(row.seance_id).toString(32));
        const event = await this.google.upsertEvent(googleId, eventId, body, notify);
        await this.db.query(
          `UPDATE calendrier_evenement SET google_event_id=$2, google_etag=$3,
            contenu_hash=$4, statut_synchro='SYNCED', tentatives=tentatives+1,
            derniere_synchro=now(), derniere_erreur=NULL, date_maj=now() WHERE id=$1`,
          [row.id, String(event?.id || eventId), event?.etag ?? null, contentHash],
        );
        success++;
      } catch (error: any) {
        errors++;
        this.logger.warn('Google synchronization failure on event row ' + row.id +
          ': ' + String(error?.message ?? error));
        await this.db.query(
          `UPDATE calendrier_evenement SET statut_synchro='ERROR', tentatives=tentatives+1,
           derniere_erreur=$2, date_maj=now() WHERE id=$1`,
          [row.id, String(error?.message ?? error).slice(0, 500)],
        );
      }
    }
    const remaining = await this.db.query(
      `SELECT count(*)::int AS count FROM calendrier_evenement
       WHERE calendrier_id=$1 AND statut_synchro IN ('PENDING','ERROR','DELETE_PENDING','SYNCING')`,
      [id],
    );
    const status = errors || Number(remaining[0]?.count) > 0 ? 'ERROR' : 'SYNCED';
    await this.db.query(
      `UPDATE calendrier SET statut_synchro=$2, derniere_synchro=now(),
       derniere_erreur=$3, date_maj=now() WHERE id=$1`,
      [id, status, errors ? errors + ' evenement(s) non synchronises' : null],
    );
    return {
      calendrier_id: id, google_calendar_id: googleId, notif_google_demandees: notify,
      traites: rows.length, succes: success, erreurs: errors, restants: Number(remaining[0]?.count),
      avertissement: 'Google peut envoyer certains messages meme avec sendUpdates=none.',
    };
  }

  async googleResponses(id: number, projectId: number) {
    const calendrier = await this.calendars.get(id, projectId);
    if (!calendrier.google_calendar_id) throw new BadRequestException('CALENDAR_NOT_SYNCED');
    const rows = await this.db.query(
      `SELECT ce.seance_id, ce.google_event_id FROM calendrier_evenement ce
       JOIN seance s ON s.seance_id = ce.seance_id AND s.calendrier_id = ce.calendrier_id
       WHERE ce.calendrier_id=$1 AND ce.google_event_id IS NOT NULL
       ORDER BY s.date_seance DESC LIMIT 100`, [id],
    );
    const results: any[] = [];
    for (const row of rows) {
      const googleEvent = await this.google.getEvent(calendrier.google_calendar_id, row.google_event_id);
      for (const attendee of googleEvent?.attendees ?? []) {
        const email = String(attendee.email ?? '').toLowerCase();
        if (!email || email === this.google.owner) continue;
        const matches: Array<{ compte_id: number; personne_id: number }> = await this.db.query(
          `SELECT co.id AS compte_id, p.id AS personne_id
           FROM compte co JOIN personne p ON p.compte=co.id
           JOIN login_project lp ON lp.login_id=co.id AND lp.project_id=$2
           WHERE lower(co.login)=$1 AND EXISTS (
             SELECT 1 FROM inscription_seance ins
             WHERE ins.personne_id=p.id AND ins.seance_id=$3
           )`, [email, projectId, row.seance_id],
        );
        results.push({
          seance_id: row.seance_id, google_email: email,
          google_reponse: attendee.responseStatus ?? 'needsAction',
          comptes: [...new Set(matches.map((x) => x.compte_id))],
          personnes: matches.map((x) => x.personne_id),
          peut_importer: matches.length === 1 && this.google.isProduction(),
        });
      }
    }
    return { calendrier_id: id, apercu_seulement: true, lignes: results };
  }
}

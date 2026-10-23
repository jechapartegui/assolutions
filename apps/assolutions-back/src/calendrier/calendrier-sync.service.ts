import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { CalendrierService } from './calendrier.service';
import { GoogleCalendrierClient } from './google-calendrier.client';
import { ImportGoogleReponsesDto } from './calendrier.dto';

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


/** PostgreSQL expose parfois DATE via un objet JS local : ne jamais le passer en UTC. */
function formatDateFr(dateIso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    throw new BadRequestException('CALENDAR_DATE_INVALID');
  }
  return dateIso.slice(8, 10) + '/' + dateIso.slice(5, 7) + '/' + dateIso.slice(0, 4);
}

/** Compatibilite avec Adresse de libs/shared : Street, PostCode, City, Country.
 * Le champ historique lieu.adresse reste un TEXT pouvant etre JSON ou texte libre.
 */
function formatLieuAdresse(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('{')) return trimmed;
  try {
    const item = JSON.parse(trimmed);
    if (!item || typeof item !== 'object' || Array.isArray(item)) return trimmed;
    const stringValue = (v: unknown) => typeof v === 'string' ? v.trim() : '';
    const street = stringValue(item.Street);
    const postCode = stringValue(item.PostCode);
    const city = stringValue(item.City);
    const country = stringValue(item.Country);
    const locality = [postCode, city].filter(Boolean).join(' ');
    return [street, locality, country].filter(Boolean).join(', ') || trimmed;
  } catch {
    return trimmed;
  }
}

/** Meme route partageable que le sondage WhatsApp : jamais de login ni token individuel.
 * /s/:slug utilise ensuite l'identite du compte authentifie dans ma-seance.
 */
function genericVoteLink(site: string, seanceId: number, response: 0 | 1): string {
  const slug = Buffer.from(JSON.stringify({ i: seanceId, r: response }), 'utf8').toString('base64url');
  return site + '/s/' + slug;
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
    // Le proprietaire OAuth est deja l'organisateur de l'evenement Google :
    // l'inviter a nouveau peut produire un doublon dans son agenda principal.
    const emails = [
      ...rows.map((r) => this.google.recipient(r.login, r.id)),
      ...projectEmails.map((x: string) => this.google.recipient(x)),
    ];
    return [...new Set(emails.filter((e) =>
      e.toLowerCase() !== this.google.owner &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))];
  }

  private async eventBody(
    seanceId: number, calendrier: any, invitees: string[],
  ) {
    const rows = await this.db.query(
      `SELECT se.*, se.date_seance::text AS date_iso, l.nom AS lieu_nom, l.adresse AS lieu_adresse,
         COALESCE((SELECT string_agg(DISTINCT g.nom, ', ' ORDER BY g.nom)
          FROM lien_groupe lg JOIN groupes g ON g.id = lg.groupe_id
          WHERE lg.object_type = 'séance' AND lg.object_id = se.seance_id), '') AS groupes
       FROM seance se LEFT JOIN lieu l ON l.id = se.lieu_id
       WHERE se.seance_id = $1 AND se.calendrier_id = $2 AND se.saison_id = $3`,
      [seanceId, calendrier.id, calendrier.saison_id],
    );
    if (!rows.length) throw new NotFoundException('SEANCE_NOT_IN_CALENDAR');
    const seance = rows[0];
    // DATE PostgreSQL conserve son jour civil en SQL ; conversion UTC interdite.
    const date = String(seance.date_iso ?? '');
    const dateFr = formatDateFr(date);
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
      site ? 'Consulter Assolutions : ' + site + '/ma-seance?id=' + seanceId : '',
      // Reprise du sondage WhatsApp : le lien est identique pour tous les invites,
      // ne contient aucune identite personnelle et exige les droits Assolutions.
      site ? (seance.type_seance + ' ' + (seance.label || '') +
        ' le ' + dateFr + ' à ' + String(seance.heure_debut).slice(0, 5) + '. Vous venez ?') : '',
      site ? 'Oui : ' + genericVoteLink(site, seanceId, 1) : '',
      site ? 'Non : ' + genericVoteLink(site, seanceId, 0) : '',
    ].filter(Boolean).join('\n');

    return {
      summary: (this.google.isProduction() ? '' : this.google.calendarName('Séance') + ' - ') +
        (seance.label || seance.type_seance || 'Séance') + (seance.groupes ? ' — ' + seance.groupes : ''),
      description,
      location: [seance.lieu_nom, formatLieuAdresse(seance.lieu_adresse)].filter(Boolean).join(' — '),
      start: { dateTime: start.toISOString(), timeZone: calendrier.timezone },
      end: { dateTime: end.toISOString(), timeZone: calendrier.timezone },
      // Rappels Google popup : 1h et 1 jour avant le debut (sur l'agenda gere).
      reminders: { useDefault: false, overrides: [
        { method: 'popup', minutes: 60 }, { method: 'popup', minutes: 1440 },
      ] },
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
      contenu_hash: string | null; statut_synchro: string; still_linked: boolean }> = await this.db.query(
      `SELECT ce.*,
          EXISTS (
            SELECT 1 FROM seance se
            WHERE se.seance_id = ce.seance_id
              AND se.calendrier_id = ce.calendrier_id
          ) AS still_linked
       FROM calendrier_evenement ce WHERE ce.calendrier_id = $1
       AND (ce.statut_synchro IN ('PENDING', 'ERROR', 'DELETE_PENDING', 'SYNCING')
          OR ce.contenu_hash IS NULL)
       ORDER BY (ce.statut_synchro = 'DELETE_PENDING') DESC, ce.id LIMIT 100`, [id],
    );
    let success = 0, errors = 0;
    for (const row of rows) {
      try {
        // Le statut ERROR remplace DELETE_PENDING après un échec distant.
        // L'appartenance actuelle de la séance reste la source de vérité :
        // une séance détachée doit TOUJOURS être supprimée sur Google au retry.
        const isRemoval = row.statut_synchro === 'DELETE_PENDING' ||
          row.seance_id == null || !row.still_linked;
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


  /**
   * Une adresse invitee correspond a un COMPTE. Les personnes de ce compte
   * doivent etre selectionnees explicitement pour chaque seance.
   */
  private async comptesDuProjet(projectId: number) {
    const rows: Array<{ id: number; login: string }> = await this.db.query(
      `SELECT co.id, co.login FROM compte co
       INNER JOIN login_project lp ON lp.login_id=co.id
       WHERE lp.project_id=$1 AND co.actif=true`, [projectId],
    );
    return rows.map((r) => ({
      ...r, guestEmail: this.google.recipient(r.login, r.id).toLowerCase(),
    }));
  }


  /**
   * EXG-FIX-05 : meme logique de participants que l'ecran Seance.
   * Une inscription explicite autorise une correspondance ; sinon le membre
   * d'un groupe lie a la SEANCE (pas au calendrier) est candidat seulement
   * si la convocation n'est pas nominative et si les limites d'age s'appliquent.
   * La presence dans un groupe DESTINATAIRE du calendrier n'est jamais suffisante.
   */
  private async candidatsSeance(
    seanceId: number, calendrierId: number, projectId: number, compteId: number,
    queryable: { query(sql: string, params?: any[]): Promise<any> } = this.db,
  ): Promise<Array<{ id: number; nom: string; origine: 'inscription' | 'groupe_seance' }>> {
    const rows: Array<{ id: number; nom: string; inscription_existante: boolean }> =
      await queryable.query(
        `SELECT pe.id, concat_ws(' ', nullif(btrim(pe.first_name), ''), nullif(btrim(pe.last_name), '')) AS nom,
                (ins.personne_id IS NOT NULL) AS inscription_existante
           FROM personne pe
           JOIN seance se ON se.seance_id=$2 AND se.calendrier_id=$3
           JOIN saison sa ON sa.id=se.saison_id AND sa.project_id=$4
           LEFT JOIN inscription_seance ins
             ON ins.personne_id=pe.id AND ins.seance_id=se.seance_id
          WHERE pe.compte=$1 AND COALESCE(pe.archive,false)=false
            AND (
              (ins.personne_id IS NOT NULL AND ins.statut_inscription IS DISTINCT FROM 'essai')
              OR
              (ins.personne_id IS NULL
                AND COALESCE(se.convocation_nominative,false)=false
                AND EXISTS (
                  SELECT 1 FROM lien_groupe ls
                  JOIN lien_groupe lp ON lp.groupe_id=ls.groupe_id
                   AND lp.object_type='rider' AND lp.object_id=pe.id
                  WHERE ls.object_type='séance' AND ls.object_id=se.seance_id
                )
                AND (se.age_minimum IS NULL OR (
                  pe.date_naissance IS NOT NULL
                  AND EXTRACT(YEAR FROM age(CURRENT_DATE, pe.date_naissance)) >= se.age_minimum
                ))
                AND (se.age_maximum IS NULL OR (
                  pe.date_naissance IS NOT NULL
                  AND EXTRACT(YEAR FROM age(CURRENT_DATE, pe.date_naissance)) <= se.age_maximum
                ))
              )
            )
          ORDER BY pe.last_name, pe.first_name, pe.id`,
        [compteId, seanceId, calendrierId, projectId],
      );
    return rows.map((p) => ({
      id: Number(p.id),
      nom: p.nom || ('Personne #' + p.id),
      origine: p.inscription_existante ? 'inscription' : 'groupe_seance',
    }));
  }

  async googleResponses(id: number, projectId: number) {
    const calendrier = await this.calendars.get(id, projectId);
    if (!calendrier.google_calendar_id) throw new BadRequestException('CALENDAR_NOT_SYNCED');
    const rows: Array<{ seance_id: number; google_event_id: string }> = await this.db.query(
      `SELECT ce.seance_id, ce.google_event_id FROM calendrier_evenement ce
       JOIN seance se ON se.seance_id=ce.seance_id AND se.calendrier_id=ce.calendrier_id
       WHERE ce.calendrier_id=$1 AND ce.google_event_id IS NOT NULL
       ORDER BY se.date_seance DESC LIMIT 100`, [id],
    );
    const comptes = await this.comptesDuProjet(projectId);
    const resultat: Array<any> = [];
    for (const row of rows) {
      const remote = await this.google.getEvent(calendrier.google_calendar_id, row.google_event_id);
      for (const attendee of remote?.attendees ?? []) {
        const email = String(attendee.email ?? '').trim().toLowerCase();
        if (!email || email === this.google.owner) continue;
        const found = comptes.filter((c) => c.guestEmail === email);
        const accountIds = found.map((c) => Number(c.id));
        const personnes = found.length === 1
          ? await this.candidatsSeance(row.seance_id, id, projectId, accountIds[0])
          : [];
        resultat.push({
          seance_id: row.seance_id, google_email: email,
          google_reponse: attendee.responseStatus ?? 'needsAction',
          comptes: accountIds,
          personnes: personnes.map((p) => p.id),
          personnes_details: personnes,
          peut_importer: found.length === 1 && personnes.length > 0 &&
            ['accepted', 'declined'].includes(String(attendee.responseStatus)),
        });
      }
    }
    return { calendrier_id: id, apercu_seulement: true, lignes: resultat };
  }

  /**
   * Relecture REELLE de Google au moment de l'import pour empecher un client
   * de forger une reponse. Import MANUEL uniquement : une personne visible
   * via un groupe de seance peut etre inscrite explicitement lors de ce clic
   * (jamais juste en consultant Google). Conserver statut_seance intact.
   */
  async importGoogleResponses(
    id: number, projectId: number, acteurCompteId: number, dto: ImportGoogleReponsesDto,
  ) {
    if (!Array.isArray(dto.lignes) || !dto.lignes.length || dto.lignes.length > 20) {
      throw new BadRequestException('GOOGLE_RSVP_SELECTION_REQUIRED_MAX_20');
    }
    const calendar = await this.calendars.get(id, projectId);
    if (!calendar.google_calendar_id) throw new BadRequestException('CALENDAR_NOT_SYNCED');
    const accounts = await this.comptesDuProjet(projectId);
    const keys = new Set<string>();
    const validated: Array<{ seance_id: number; personne_id: number; compte_id: number; status: 'présent'|'absent'; origine: 'inscription'|'groupe_seance' }> = [];

    const cached = new Map<number, any>();
    for (const line of dto.lignes) {
      const key = line.seance_id + '/' + line.personne_id;
      if (keys.has(key)) throw new BadRequestException('GOOGLE_RSVP_DUPLICATE_PERSON');
      keys.add(key);
      const eventRef: Array<{ google_event_id: string }> = await this.db.query(
        `SELECT ce.google_event_id FROM calendrier_evenement ce
         JOIN seance se ON se.seance_id=ce.seance_id AND se.calendrier_id=ce.calendrier_id
         WHERE ce.calendrier_id=$1 AND ce.seance_id=$2 AND ce.google_event_id IS NOT NULL`,
        [id, line.seance_id],
      );
      if (!eventRef.length) throw new BadRequestException('GOOGLE_RSVP_SEANCE_NOT_PUBLISHED');
      if (!cached.has(line.seance_id)) {
        cached.set(line.seance_id, await this.google.getEvent(
          calendar.google_calendar_id, eventRef[0].google_event_id,
        ));
      }
      const googleEmail = line.google_email.trim().toLowerCase();
      const attendee = (cached.get(line.seance_id)?.attendees ?? []).find(
        (candidate: any) => String(candidate.email).toLowerCase() === googleEmail,
      );
      if (!attendee || attendee.responseStatus !== line.google_reponse) {
        throw new BadRequestException('GOOGLE_RSVP_NOT_CONFIRMED_BY_GOOGLE');
      }
      const matches = accounts.filter((a) => a.guestEmail === googleEmail);
      if (matches.length !== 1) throw new BadRequestException('GOOGLE_RSVP_ACCOUNT_AMBIGUOUS');
      const accountId = Number(matches[0].id);
      const candidats = await this.candidatsSeance(line.seance_id, id, projectId, accountId);
      const candidat = candidats.find((p) => p.id === line.personne_id);
      if (!candidat) throw new BadRequestException('GOOGLE_RSVP_PERSON_NOT_ELIGIBLE');
      validated.push({
        seance_id: line.seance_id, personne_id: line.personne_id,
        compte_id: accountId,
        status: line.google_reponse === 'accepted' ? 'présent' : 'absent',
        origine: candidat.origine,
      });
    }

    await this.db.transaction(async (manager) => {
      for (const item of validated) {
        // Nouvelle verification dans la transaction : le groupe de la seance
        // et l'appartenance du compte doivent encore autoriser ce candidat.
        const autorises = await this.candidatsSeance(
          item.seance_id, id, projectId, item.compte_id, manager,
        );
        if (!autorises.some((p) => p.id === item.personne_id)) {
          throw new BadRequestException('GOOGLE_RSVP_PERSON_NOT_ELIGIBLE');
        }
        // L'ajout d'une ligne est UNIQUEMENT declenche par cette confirmation admin.
        // Un compte repondant sur Google seul n'inscrit personne dans Assolutions.
        const updated: Array<{ statut_inscription: string }> = await manager.query(
          `INSERT INTO inscription_seance(personne_id,seance_id,statut_inscription,date_inscription)
           VALUES($1,$2,$3,now())
           ON CONFLICT (personne_id,seance_id) DO UPDATE
           SET statut_inscription=EXCLUDED.statut_inscription, date_inscription=now()
           WHERE inscription_seance.statut_inscription IS DISTINCT FROM 'essai'
           RETURNING statut_inscription`,
          [item.personne_id, item.seance_id, item.status],
        );
        if (!updated.length) throw new BadRequestException('GOOGLE_RSVP_REGISTRATION_GONE');
        await manager.query(
          `INSERT INTO calendrier_synchro_log(calendrier_id, seance_id, action, statut, details)
           VALUES($1,$2,'RSVP_IMPORT','SYNCED',$3::jsonb)`,
          [id, item.seance_id, JSON.stringify({
            source:'GOOGLE', acteur_compte_id:acteurCompteId,
            personne_id:item.personne_id, statut:item.status,
            origine:item.origine, inscription_creee:item.origine === 'groupe_seance',
          })],
        );
      }
    });
    return { importees: validated.length, ids: validated.map((x) => ({
      seance_id: x.seance_id, personne_id: x.personne_id, statut: x.status,
    })) };
  }
}

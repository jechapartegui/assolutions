import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CreateCalendrierDto, UpdateCalendrierDto } from './calendrier.dto';
import { GoogleCalendrierClient } from './google-calendrier.client';
import { queueMail } from '../mail-queue';

/**
 * EXG-01..05/09/20: etat local des calendriers et selection explicite des seances.
 * Aucune operation reseau vers Google dans les transactions SQL.
 */
@Injectable()
export class CalendrierService {
  constructor(private readonly dataSource: DataSource, private readonly google: GoogleCalendrierClient) {}

  private ids(values: number[] | undefined): number[] {
    return [...new Set((values ?? []).map(Number))].filter((n) => Number.isInteger(n) && n > 0);
  }

  private async assertSaison(saisonId: number, projectId: number, db: EntityManager) {
    const rows = await db.query('SELECT id FROM saison WHERE id = $1 AND project_id = $2', [saisonId, projectId]);
    if (!rows.length) throw new ForbiddenException('SAISON_OUTSIDE_PROJECT');
  }

  private async assertSelection(saisonId: number, groupeIds: number[], seanceIds: number[], db: EntityManager) {
    if (groupeIds.length) {
      const rows: Array<{ id: number }> = await db.query(
        'SELECT id FROM groupes WHERE saison_id = $1 AND id = ANY($2::int[])',
        [saisonId, groupeIds],
      );
      if (rows.length !== groupeIds.length) throw new BadRequestException('GROUP_OUTSIDE_CALENDAR_SEASON');
    }
    if (seanceIds.length) {
      const rows: Array<{ seance_id: number; calendrier_id: number | null }> = await db.query(
        'SELECT seance_id, calendrier_id FROM seance WHERE saison_id = $1 AND seance_id = ANY($2::int[]) FOR UPDATE',
        [saisonId, seanceIds],
      );
      if (rows.length !== seanceIds.length) throw new BadRequestException('SEANCE_OUTSIDE_CALENDAR_SEASON');
    }
  }

  async list(projectId: number, saisonId?: number) {
    const filters = saisonId ? 'AND c.saison_id = $2' : '';
    return this.dataSource.query(
      `SELECT c.*,
          COALESCE((SELECT array_agg(cg.groupe_id ORDER BY cg.groupe_id)
                     FROM calendrier_groupe cg WHERE cg.calendrier_id = c.id), '{}') AS groupe_ids,
          (SELECT count(*)::int FROM seance se WHERE se.calendrier_id = c.id) AS nb_seances
         FROM calendrier c WHERE c.project_id = $1 ${filters}
         ORDER BY c.saison_id DESC, c.nom`,
      saisonId ? [projectId, saisonId] : [projectId],
    );
  }

  async get(id: number, projectId: number) {
    const rows = await this.dataSource.query(
      `SELECT c.*,
         COALESCE((SELECT array_agg(groupe_id ORDER BY groupe_id) FROM calendrier_groupe WHERE calendrier_id = c.id), '{}') AS groupe_ids,
         COALESCE((SELECT array_agg(seance_id ORDER BY seance_id) FROM seance WHERE calendrier_id = c.id), '{}') AS seance_ids
       FROM calendrier c WHERE c.id = $1 AND c.project_id = $2`,
      [id, projectId],
    );
    if (!rows.length) throw new NotFoundException('CALENDRIER_NOT_FOUND');
    return rows[0];
  }

  /** EXG-32 : uniquement calendriers actifs des groupes destinataires du compte. */
  async mesExiste(accountId: number, projectId: number): Promise<{ existe: boolean }> {
    const rows: Array<{ existe: boolean }> = await this.dataSource.query(
      `SELECT EXISTS (
          SELECT 1 FROM calendrier c
          WHERE c.project_id=$2 AND c.actif=true
            AND (
                EXISTS (SELECT 1 FROM login_project lp
                        WHERE lp.project_id=c.project_id AND lp.login_id=$1)
                AND EXISTS (
                  SELECT 1 FROM calendrier_groupe cg
                  JOIN lien_groupe lg ON lg.groupe_id=cg.groupe_id AND lg.object_type='rider'
                  JOIN personne pe ON pe.id=lg.object_id
                  WHERE cg.calendrier_id=c.id AND pe.compte=$1
                    AND COALESCE(pe.archive,false)=false
                )
            )
        ) AS existe`, [accountId,projectId],
    );
    return { existe: rows[0]?.existe === true };
  }

  async mes(accountId: number, projectId: number) {
    return this.dataSource.query(
      `SELECT c.id,c.nom,c.description,c.timezone,c.saison_id,
              c.google_calendar_url,c.statut_synchro
       FROM calendrier c
       WHERE c.project_id=$2 AND c.actif=true
         AND (
             EXISTS (SELECT 1 FROM login_project lp WHERE lp.project_id=c.project_id AND lp.login_id=$1)
             AND EXISTS (
               SELECT 1 FROM calendrier_groupe cg
               JOIN lien_groupe lg ON lg.groupe_id=cg.groupe_id AND lg.object_type='rider'
               JOIN personne pe ON pe.id=lg.object_id
               WHERE cg.calendrier_id=c.id AND pe.compte=$1
                 AND COALESCE(pe.archive,false)=false
             )
         )
       ORDER BY c.nom`,[accountId,projectId],
    );
  }

  /**
   * EXG-20 / EXG-UI-02 : événements du calendrier visibles par le COMPTE courant.
   * Les groupes destinataires donnent le droit de consulter, jamais de répondre.
   * Les candidats sont uniquement les personnes de CE compte, inscrites à la
   * séance ou liées à un groupe de CETTE séance (hors nominatif / bornes d'âge).
   */
  async mesEvenements(accountId: number, projectId: number) {
    const rows: Array<{
      calendrier_id: number; seance_id: number; date_seance: string;
      heure_debut: string; duree_seance: number; label: string | null;
      type_seance: string; statut: string; lieu_nom: string | null;
      groupes: string; personne_id: number | null; first_name: string | null;
      last_name: string | null; statut_inscription: string | null;
      peut_repondre: boolean;
    }> = await this.dataSource.query(
      `SELECT c.id AS calendrier_id, se.seance_id,
              se.date_seance::text AS date_seance, se.heure_debut,
              se.duree_seance, se.label, se.type_seance, se.statut,
              l.nom AS lieu_nom,
              COALESCE((
                SELECT string_agg(DISTINCT g.nom, ', ' ORDER BY g.nom)
                FROM lien_groupe lg JOIN groupes g ON g.id=lg.groupe_id
                WHERE lg.object_type='séance' AND lg.object_id=se.seance_id
              ), '') AS groupes,
              candidat.id AS personne_id, candidat.first_name,
              candidat.last_name, candidat.statut_inscription,
              (se.date_seance >= CURRENT_DATE AND se.statut = 'prévue') AS peut_repondre
       FROM calendrier c
       JOIN seance se ON se.calendrier_id=c.id
       LEFT JOIN lieu l ON l.id=se.lieu_id
       LEFT JOIN LATERAL (
         SELECT pe.id, pe.first_name, pe.last_name, ins.statut_inscription
         FROM personne pe
         LEFT JOIN inscription_seance ins
           ON ins.personne_id=pe.id AND ins.seance_id=se.seance_id
         WHERE pe.compte=$1 AND COALESCE(pe.archive,false)=false
           AND (
             (ins.personne_id IS NOT NULL
               AND ins.statut_inscription IS DISTINCT FROM 'essai')
             OR
             (ins.personne_id IS NULL
               AND COALESCE(se.convocation_nominative,false)=false
               AND EXISTS (
                 SELECT 1 FROM lien_groupe ls
                 JOIN lien_groupe lr ON lr.groupe_id=ls.groupe_id
                   AND lr.object_type='rider' AND lr.object_id=pe.id
                 WHERE ls.object_type='séance' AND ls.object_id=se.seance_id
               )
               AND (se.age_minimum IS NULL OR (
                 pe.date_naissance IS NOT NULL
                 AND EXTRACT(YEAR FROM age(CURRENT_DATE,pe.date_naissance)) >= se.age_minimum
               ))
               AND (se.age_maximum IS NULL OR (
                 pe.date_naissance IS NOT NULL
                 AND EXTRACT(YEAR FROM age(CURRENT_DATE,pe.date_naissance)) <= se.age_maximum
               ))
             )
           )
       ) candidat ON TRUE
       WHERE c.project_id=$2 AND c.actif=true
         AND (
             EXISTS (SELECT 1 FROM login_project lp WHERE lp.project_id=c.project_id AND lp.login_id=$1)
             AND EXISTS (
               SELECT 1 FROM calendrier_groupe cg
               JOIN lien_groupe lr ON lr.groupe_id=cg.groupe_id AND lr.object_type='rider'
               JOIN personne membre ON membre.id=lr.object_id
               WHERE cg.calendrier_id=c.id AND membre.compte=$1
                 AND COALESCE(membre.archive,false)=false
             )
         )
       ORDER BY se.date_seance, se.heure_debut, se.seance_id, candidat.last_name, candidat.first_name
       LIMIT 2000`,
      [accountId, projectId],
    );
    const result = new Map<string, any>();
    for (const row of rows) {
      const key = row.calendrier_id + '/' + row.seance_id;
      if (!result.has(key)) {
        result.set(key, {
          calendrier_id: Number(row.calendrier_id),
          seance_id: Number(row.seance_id),
          date_seance: row.date_seance,
          heure_debut: String(row.heure_debut ?? '').slice(0, 5),
          duree_seance: Number(row.duree_seance ?? 0),
          label: row.label,
          type_seance: row.type_seance,
          statut: row.statut,
          lieu_nom: row.lieu_nom,
          groupes: row.groupes,
          peut_repondre: row.peut_repondre,
          personnes: [],
        });
      }
      if (row.personne_id != null) {
        result.get(key).personnes.push({
          id: Number(row.personne_id),
          nom: [row.first_name, row.last_name].filter(Boolean).join(' ').trim(),
          statut_inscription: row.statut_inscription,
        });
      }
    }
    return [...result.values()];
  }

  /**
   * Réponse Oui/Non uniquement si le compte voit le calendrier ET si la
   * personne est éligible à CETTE séance. Vérification et mutation atomiques.
   * Aucun RSVP Google modifié et aucune présence effective touchée.
   */
  async repondreEvenement(
    accountId: number, projectId: number, seanceId: number,
    personneId: number, statut: 'présent' | 'absent',
  ) {
    const updated: Array<{ personne_id: number; seance_id: number; statut_inscription: string }> =
      await this.dataSource.query(
        `INSERT INTO inscription_seance (personne_id,seance_id,statut_inscription,date_inscription)
         SELECT pe.id, se.seance_id, $5::text::inscription_seance_statut_inscription_enum, now()
         FROM seance se
         JOIN calendrier c ON c.id=se.calendrier_id
         JOIN personne pe ON pe.id=$4 AND pe.compte=$1 AND COALESCE(pe.archive,false)=false
         LEFT JOIN inscription_seance ins ON ins.personne_id=pe.id AND ins.seance_id=se.seance_id
         WHERE se.seance_id=$3 AND c.project_id=$2 AND c.actif=true
           AND se.statut='prévue' AND se.date_seance>=CURRENT_DATE
           AND (
               EXISTS (SELECT 1 FROM login_project lp WHERE lp.project_id=c.project_id AND lp.login_id=$1)
               AND EXISTS (
                 SELECT 1 FROM calendrier_groupe cg
                 JOIN lien_groupe lr ON lr.groupe_id=cg.groupe_id AND lr.object_type='rider'
                 JOIN personne membre ON membre.id=lr.object_id
                 WHERE cg.calendrier_id=c.id AND membre.compte=$1
                   AND COALESCE(membre.archive,false)=false
               )
           )
           AND (
             (ins.personne_id IS NOT NULL AND ins.statut_inscription IS DISTINCT FROM 'essai')
             OR
             (ins.personne_id IS NULL AND COALESCE(se.convocation_nominative,false)=false
               AND EXISTS (
                 SELECT 1 FROM lien_groupe ls
                 JOIN lien_groupe lr ON lr.groupe_id=ls.groupe_id
                   AND lr.object_type='rider' AND lr.object_id=pe.id
                 WHERE ls.object_type='séance' AND ls.object_id=se.seance_id
               )
               AND (se.age_minimum IS NULL OR (
                 pe.date_naissance IS NOT NULL
                 AND EXTRACT(YEAR FROM age(CURRENT_DATE,pe.date_naissance)) >= se.age_minimum
               ))
               AND (se.age_maximum IS NULL OR (
                 pe.date_naissance IS NOT NULL
                 AND EXTRACT(YEAR FROM age(CURRENT_DATE,pe.date_naissance)) <= se.age_maximum
               ))
             )
           )
         ON CONFLICT (personne_id,seance_id) DO UPDATE
           SET statut_inscription=EXCLUDED.statut_inscription, date_inscription=now()
           WHERE inscription_seance.statut_inscription IS DISTINCT FROM 'essai'
         RETURNING personne_id,seance_id,statut_inscription`,
        [accountId, projectId, seanceId, personneId, statut],
      );
    if (updated.length !== 1) {
      throw new ForbiddenException('CALENDAR_SEANCE_RESPONSE_NOT_ALLOWED');
    }
    return {
      seance_id: Number(updated[0].seance_id),
      personne_id: Number(updated[0].personne_id),
      statut_inscription: updated[0].statut_inscription,
    };
  }

  async seances(id: number, projectId: number) {
    await this.get(id, projectId);
    return this.dataSource.query(
      `SELECT se.seance_id, se.date_seance, se.heure_debut, se.duree_seance,
         se.label, se.type_seance, se.statut, se.calendrier_id,
         COALESCE((SELECT string_agg(DISTINCT g.nom, ', ' ORDER BY g.nom)
           FROM lien_groupe lg INNER JOIN groupes g ON g.id = lg.groupe_id
           WHERE lg.object_type = 'séance' AND lg.object_id = se.seance_id), '') AS groupes,
         ce.statut_synchro, ce.derniere_synchro, ce.derniere_erreur
       FROM seance se LEFT JOIN calendrier_evenement ce
         ON ce.seance_id = se.seance_id AND ce.calendrier_id = $1
       WHERE se.calendrier_id = $1
       ORDER BY se.date_seance, se.heure_debut`,
      [id],
    );
  }

  private async replaceSelection(
    id: number, saisonId: number, groupeIds: number[] | undefined,
    seanceIds: number[] | undefined, db: EntityManager,
  ) {
    const groupes = groupeIds === undefined ? undefined : this.ids(groupeIds);
    const seances = seanceIds === undefined ? undefined : this.ids(seanceIds);
    await this.assertSelection(saisonId, groupes ?? [], seances ?? [], db);

    if (groupes !== undefined) {
      await db.query('DELETE FROM calendrier_groupe WHERE calendrier_id = $1', [id]);
      if (groupes.length) {
        await db.query(
          `INSERT INTO calendrier_groupe (calendrier_id, groupe_id)
            SELECT $1, unnest($2::int[])`, [id, groupes],
        );
      }
    }

    if (seances !== undefined) {
      const conflicts: Array<{ seance_id: number }> = seances.length
        ? await db.query(
            `SELECT seance_id FROM seance
             WHERE seance_id = ANY($1::int[]) AND calendrier_id IS NOT NULL
               AND calendrier_id <> $2`, [seances, id],
          )
        : [];
      if (conflicts.length) {
        throw new BadRequestException('SEANCE_ALREADY_IN_ANOTHER_CALENDAR');
      }
      // La dissociation garde l'eventId et marque DELETE_PENDING via trigger SQL.
      await db.query('UPDATE seance SET calendrier_id = NULL WHERE calendrier_id = $1 AND NOT (seance_id = ANY($2::int[]))',
        [id, seances]);
      if (seances.length) {
        await db.query('UPDATE seance SET calendrier_id = $1 WHERE seance_id = ANY($2::int[])',
          [id, seances]);
        await db.query(
          `INSERT INTO calendrier_evenement (calendrier_id, seance_id, statut_synchro)
             SELECT $1, unnest($2::int[]), 'PENDING'
             ON CONFLICT (calendrier_id, seance_id) DO UPDATE
             SET statut_synchro = CASE
                WHEN calendrier_evenement.statut_synchro IN ('DELETE_PENDING', 'DELETED')
                THEN 'PENDING' ELSE calendrier_evenement.statut_synchro END`,
          [id, seances],
        );
      }
      await db.query(
        `UPDATE calendrier SET statut_synchro = 'PENDING', date_maj = now() WHERE id = $1`,
        [id],
      );
    }
    // Le formulaire d'edition transmet TOUJOURS les seances ET les groupes.
    // Ce bloc doit donc rester independant du bloc 'seances' : sinon les
    // invitations existantes restent SYNCED lors d'un changement d'audience
    // (notamment apres correction de l'adresse Yopmail de test).
    if (groupes !== undefined) {
      await db.query(
        `UPDATE calendrier_evenement ce
         SET statut_synchro = 'PENDING', date_maj = now()
         WHERE ce.calendrier_id = $1
           AND ce.statut_synchro NOT IN ('DELETE_PENDING', 'DELETED')
           AND EXISTS (
             SELECT 1 FROM seance se
             WHERE se.seance_id = ce.seance_id
               AND se.calendrier_id = ce.calendrier_id
           )`,
        [id],
      );
      await db.query(
        "UPDATE calendrier SET statut_synchro = 'PENDING', date_maj = now() WHERE id = $1",
        [id],
      );
    }
  }

  async create(dto: CreateCalendrierDto, projectId: number) {
    if (!dto.nom?.trim()) throw new BadRequestException('CALENDAR_NAME_REQUIRED');
    return this.dataSource.transaction(async (db) => {
      await this.assertSaison(dto.saison_id, projectId, db);
      const result = await db.query(
        `INSERT INTO calendrier (project_id, saison_id, nom, description, timezone, notifier_mises_a_jour, diffusion_mode)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [projectId, dto.saison_id, dto.nom.trim(), dto.description ?? null,
          dto.timezone || 'Europe/Paris', dto.notifier_mises_a_jour ?? false,
          dto.diffusion_mode ?? 'ABONNEMENT'],
      );
      const id = Number(result[0].id);
      await this.replaceSelection(id, dto.saison_id, dto.groupe_ids ?? [], dto.seance_ids ?? [], db);
      return { id };
    });
  }

  async update(id: number, dto: UpdateCalendrierDto, projectId: number) {
    if (dto.nom !== undefined && !dto.nom.trim()) throw new BadRequestException('CALENDAR_NAME_REQUIRED');
    return this.dataSource.transaction(async (db) => {
      const rows = await db.query('SELECT * FROM calendrier WHERE id = $1 AND project_id = $2 FOR UPDATE', [id, projectId]);
      if (!rows.length) throw new NotFoundException('CALENDRIER_NOT_FOUND');
      const previous = rows[0];
      await db.query(
        `UPDATE calendrier SET nom = $2, description = $3, timezone = $4,
           notifier_mises_a_jour = $5, actif = $6, diffusion_mode = $7, date_maj = now(),
           statut_synchro = 'PENDING' WHERE id = $1`,
        [id, dto.nom?.trim() ?? previous.nom,
          dto.description === undefined ? previous.description : dto.description,
          dto.timezone ?? previous.timezone,
          dto.notifier_mises_a_jour ?? previous.notifier_mises_a_jour,
          dto.actif ?? previous.actif, dto.diffusion_mode ?? previous.diffusion_mode],
      );
      await this.replaceSelection(id, previous.saison_id, dto.groupe_ids, dto.seance_ids, db);
      // Le fuseau/nom/description du calendrier peut alterer les evenements.
      await db.query(
        `UPDATE calendrier_evenement SET statut_synchro = 'PENDING', date_maj=now()
         WHERE calendrier_id = $1 AND statut_synchro NOT IN ('DELETE_PENDING','DELETED')`,
        [id],
      );
      return { id };
    });
  }

  /** Contacts du calendrier, filtrés par groupe et projet ; aucun envoi ici. */
  async destinataires(id: number, projectId: number) {
    await this.get(id, projectId);
    return this.dataSource.query(
      `SELECT co.id AS compte_id, co.login AS email,
              string_agg(DISTINCT trim(pe.first_name || ' ' || pe.last_name), ', ') AS personnes,
              COALESCE(cd.statut,'NON_CONTACTE') AS statut,
              COALESCE(cd.invitation_forcee,false) AS invitation_forcee,
              cd.propose_le, cd.relance_le, cd.confirme_le
       FROM compte co
       JOIN personne pe ON pe.compte=co.id AND COALESCE(pe.archive,false)=false
       JOIN lien_groupe lg ON lg.object_type='rider' AND lg.object_id=pe.id
       JOIN calendrier_groupe cg ON cg.groupe_id=lg.groupe_id AND cg.calendrier_id=$1
       JOIN login_project lp ON lp.login_id=co.id AND lp.project_id=$2
       LEFT JOIN calendrier_destinataire cd ON cd.calendrier_id=$1 AND cd.compte_id=co.id
       WHERE co.actif=true
       GROUP BY co.id, co.login, cd.statut, cd.invitation_forcee,
                cd.propose_le, cd.relance_le, cd.confirme_le
       ORDER BY personnes, co.id`,
      [id, projectId],
    );
  }

  /** Suivi manuel sans prétendre connaître l'abonnement réel chez Google. */
  async actionDestinataire(id: number, projectId: number, compteId: number,
    action: 'CONFIRME_MANUELLEMENT' | 'INVITATIONS_FORCEES' | 'NON_CONTACTE' | 'EXCLU') {
    return this.dataSource.transaction(async db => {
      const calendrier = await db.query(
        'SELECT id, diffusion_mode FROM calendrier WHERE id=$1 AND project_id=$2 FOR UPDATE',
        [id, projectId],
      );
      if (!calendrier.length) throw new NotFoundException('CALENDRIER_NOT_FOUND');
      const membre = await db.query(
        `SELECT 1 FROM compte co JOIN login_project lp ON lp.login_id=co.id AND lp.project_id=$3
         WHERE co.id=$2 AND co.actif=true AND EXISTS(
           SELECT 1 FROM personne p
           JOIN lien_groupe lg ON lg.object_type='rider' AND lg.object_id=p.id
           JOIN calendrier_groupe cg ON cg.groupe_id=lg.groupe_id
           WHERE p.compte=co.id AND COALESCE(p.archive,false)=false
             AND cg.calendrier_id=$1)`,
        [id, compteId, projectId],
      );
      if (!membre.length) throw new ForbiddenException('CALENDAR_RECIPIENT_NOT_ELIGIBLE');
      if (action === 'INVITATIONS_FORCEES' && calendrier[0].diffusion_mode !== 'MIXTE') {
        throw new BadRequestException('CALENDAR_MIXED_MODE_REQUIRED');
      }
      const forced = action === 'INVITATIONS_FORCEES';
      await db.query(
        `INSERT INTO calendrier_destinataire(calendrier_id, compte_id, statut,
             invitation_forcee, confirme_le, date_maj)
         VALUES ($1,$2,$3,$4,CASE WHEN $3='CONFIRME_MANUELLEMENT' THEN now() ELSE NULL END,now())
         ON CONFLICT(calendrier_id,compte_id) DO UPDATE
         SET statut=EXCLUDED.statut, invitation_forcee=EXCLUDED.invitation_forcee,
             confirme_le=EXCLUDED.confirme_le,date_maj=now()`,
        [id, compteId, action, forced],
      );
      await db.query(
        `UPDATE calendrier_evenement SET statut_synchro='PENDING', date_maj=now()
         WHERE calendrier_id=$1 AND statut_synchro NOT IN ('DELETE_PENDING','DELETED')`, [id],
      );
      await db.query(
        "UPDATE calendrier SET statut_synchro='PENDING',date_maj=now() WHERE id=$1", [id],
      );
      return { calendrier_id:id, compte_id:compteId, statut:action, invitation_forcee:forced };
    });
  }

  /** Action volontaire : partage Google privé + un seul mail Assolutions. */
  async proposerAbonnement(id: number, projectId: number, compteId: number,
    action: 'PROPOSER' | 'RELANCER') {
    const calendrier = await this.get(id, projectId);
    if (!calendrier.google_calendar_id) throw new BadRequestException('CALENDAR_NOT_SYNCED');
    await this.google.assertCalendarEnvironment(calendrier.google_calendar_id);
    const personnes = await this.destinataires(id, projectId);
    const personne = personnes.find((x: any) => Number(x.compte_id) === compteId);
    if (!personne) throw new ForbiddenException('CALENDAR_RECIPIENT_NOT_ELIGIBLE');
    if (personne.statut === 'CONFIRME_MANUELLEMENT' || personne.statut === 'EXCLU') {
      throw new BadRequestException('CALENDAR_RECIPIENT_ALREADY_CONFIRMED_OR_EXCLUDED');
    }
    if (action === 'PROPOSER' && personne.propose_le) {
      throw new BadRequestException('CALENDAR_SUBSCRIPTION_ALREADY_PROPOSED');
    }
    if (action === 'RELANCER' && !personne.propose_le) {
      throw new BadRequestException('CALENDAR_SUBSCRIPTION_NOT_PROPOSED');
    }
    const previousDate = action === 'RELANCER'
      ? (personne.relance_le ?? personne.propose_le) : personne.propose_le;
    if (previousDate && Date.now() - new Date(previousDate).getTime() < 86400000) {
      throw new BadRequestException('CALENDAR_REMINDER_TOO_SOON_24H');
    }
    const target = this.google.recipient(personne.email, compteId);
    const aclCreated = await this.google.shareCalendarReader(calendrier.google_calendar_id, target);
    const link = calendrier.google_calendar_url ||
      'https://calendar.google.com/calendar/u/0/r?cid=' +
        encodeURIComponent(calendrier.google_calendar_id);
    const result = await queueMail({
      to: target, subject: action === 'RELANCER'
        ? 'Rappel : calendrier ' + calendrier.nom
        : 'Ajouter le calendrier ' + calendrier.nom,
      text: 'Bonjour,\\n\\nLe calendrier « ' + calendrier.nom +
        ' » est disponible en lecture seule. Pour le retrouver dans votre Google Agenda, ' +
        'ouvrez ce lien avec le compte associé à cette adresse :\\n' + link +
        '\\n\\nLes réponses de présence restent gérées dans Assolutions.\\n',
    });
    if (!result.ok) throw new BadRequestException('CALENDAR_SUBSCRIPTION_EMAIL_FAILED');
    await this.dataSource.query(
      `INSERT INTO calendrier_destinataire (calendrier_id,compte_id,statut,propose_le,relance_le,acl_gere)
       VALUES ($1,$2,'PROPOSE',now(),CASE WHEN $3='RELANCER' THEN now() ELSE NULL END,$4)
       ON CONFLICT (calendrier_id,compte_id) DO UPDATE
       SET statut='PROPOSE',
           acl_gere=calendrier_destinataire.acl_gere OR EXCLUDED.acl_gere,
           propose_le=COALESCE(calendrier_destinataire.propose_le,now()),
           relance_le=CASE WHEN $3='RELANCER' THEN now() ELSE calendrier_destinataire.relance_le END,
           date_maj=now()`,
      [id, compteId, action, aclCreated],
    );
    return { envoye: true, compte_id: compteId, action };
  }

  async archive(id: number, projectId: number) {
    await this.get(id, projectId);
    // Pas de suppression physique : on preserve les correspondances pour nettoyage Google.
    await this.dataSource.query(
      "UPDATE calendrier SET actif = false, statut_synchro = 'DISABLED', date_maj = now() WHERE id = $1", [id],
    );
    return { id, archived: true };
  }

  async preview(id: number, projectId: number) {
    const calendar = await this.get(id, projectId);
    const accounts: Array<{ id: number; login: string }> = await this.dataSource.query(
      `SELECT DISTINCT co.id, co.login FROM compte co
       JOIN personne p ON p.compte = co.id AND COALESCE(p.archive, false) = false
       JOIN lien_groupe lg ON lg.object_type = 'rider' AND lg.object_id = p.id
       JOIN calendrier_groupe cg ON cg.groupe_id = lg.groupe_id AND cg.calendrier_id = $1
       JOIN login_project lp ON lp.login_id = co.id AND lp.project_id = $2
       WHERE co.actif = true ORDER BY co.id`, [id, projectId],
    );
    const sessions: Array<{ seance_id: number }> = await this.dataSource.query(
      'SELECT seance_id FROM seance WHERE calendrier_id = $1', [id],
    );
    // Apercu des vraies suppressions DISTANTES, y compris un retry en ERROR.
    // Ne pas confondre seance retiree de l'agenda et seance supprimee d'Assolutions.
    const suppressions: Array<{ count: number }> = await this.dataSource.query(
      `SELECT count(*)::int AS count
       FROM calendrier_evenement ce
       WHERE ce.calendrier_id = $1 AND ce.google_event_id IS NOT NULL
         AND ce.statut_synchro <> 'DELETED'
         AND (
           ce.statut_synchro = 'DELETE_PENDING' OR NOT EXISTS (
             SELECT 1 FROM seance se WHERE se.seance_id = ce.seance_id
               AND se.calendrier_id = ce.calendrier_id
           )
         )`, [id],
    );
    return {
      calendrier_id: id, saison_id: calendar.saison_id, nb_comptes: accounts.length,
      nb_seances: sessions.length, nb_evenements_a_supprimer: Number(suppressions[0]?.count ?? 0),
      comptes: accounts.map((x) => ({ id: x.id, email: x.login })),
      avertissement: 'Assolutions fait foi. Les convocations et reponses restent sur Assolutions ; les emails Google ne sont pas garantis silencieux.',
    };
  }
}

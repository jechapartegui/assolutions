import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CreateCalendrierDto, UpdateCalendrierDto } from './calendrier.dto';

/**
 * EXG-01..05/09/20: etat local des calendriers et selection explicite des seances.
 * Aucune operation reseau vers Google dans les transactions SQL.
 */
@Injectable()
export class CalendrierService {
  constructor(private readonly dataSource: DataSource) {}

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

  async mes(accountId: number, projectId: number) {
    return this.dataSource.query(
      `SELECT DISTINCT c.id, c.nom, c.description, c.timezone, c.saison_id,
           c.google_calendar_url, c.statut_synchro
       FROM calendrier c
       INNER JOIN calendrier_groupe cg ON cg.calendrier_id = c.id
       INNER JOIN lien_groupe lg ON lg.groupe_id = cg.groupe_id AND lg.object_type = 'rider'
       INNER JOIN personne p ON p.id = lg.object_id AND p.compte = $1 AND COALESCE(p.archive, false) = false
       INNER JOIN login_project lp ON lp.login_id = p.compte AND lp.project_id = c.project_id
       WHERE c.project_id = $2 AND c.actif = true ORDER BY c.nom`,
      [accountId, projectId],
    );
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
                WHEN calendrier_evenement.statut_synchro = 'DELETE_PENDING'
                THEN 'PENDING' ELSE calendrier_evenement.statut_synchro END`,
          [id, seances],
        );
      }
      await db.query(
        `UPDATE calendrier SET statut_synchro = 'PENDING', date_maj = now() WHERE id = $1`,
        [id],
      );
    } else if (groupes !== undefined) {
      // Modification de l'audience : mettre a jour les invites Google sur chaque evenement.
      await db.query(
        `UPDATE calendrier_evenement SET statut_synchro = 'PENDING', date_maj = now()
         WHERE calendrier_id = $1 AND statut_synchro NOT IN ('DELETE_PENDING', 'DELETED')`,
        [id],
      );
      await db.query("UPDATE calendrier SET statut_synchro = 'PENDING', date_maj = now() WHERE id = $1", [id]);
    }
  }

  async create(dto: CreateCalendrierDto, projectId: number) {
    if (!dto.nom?.trim()) throw new BadRequestException('CALENDAR_NAME_REQUIRED');
    return this.dataSource.transaction(async (db) => {
      await this.assertSaison(dto.saison_id, projectId, db);
      const result = await db.query(
        `INSERT INTO calendrier (project_id, saison_id, nom, description, timezone, notifier_mises_a_jour)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [projectId, dto.saison_id, dto.nom.trim(), dto.description ?? null,
          dto.timezone || 'Europe/Paris', dto.notifier_mises_a_jour ?? false],
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
           notifier_mises_a_jour = $5, actif = $6, date_maj = now(),
           statut_synchro = 'PENDING' WHERE id = $1`,
        [id, dto.nom?.trim() ?? previous.nom,
          dto.description === undefined ? previous.description : dto.description,
          dto.timezone ?? previous.timezone,
          dto.notifier_mises_a_jour ?? previous.notifier_mises_a_jour,
          dto.actif ?? previous.actif],
      );
      await this.replaceSelection(id, previous.saison_id, dto.groupe_ids, dto.seance_ids, db);
      return { id };
    });
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
    return {
      calendrier_id: id, saison_id: calendar.saison_id, nb_comptes: accounts.length,
      nb_seances: sessions.length, comptes: accounts.map((x) => ({ id: x.id, email: x.login })),
      avertissement: 'Assolutions fait foi. Les convocations et reponses restent sur Assolutions ; les emails Google ne sont pas garantis silencieux.',
    };
  }
}

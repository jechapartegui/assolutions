import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

type StatutInscription =
  | 'présent'
  | 'absent'
  | 'convoqué'
  | 'essai'
  | null;

type StatutPresence = 'présent' | 'absent' | null;

type Row = {
  personne_id: number;
  est_adherent: boolean;
  acces_inscription: boolean;
  dans_groupe_adherent: boolean;
  essai_disponible: boolean;
  seance_id: number;
  groupe_ids: number[] | null;
  groupe_noms: string[] | null;
  statut_inscription: StatutInscription;
  statut_presence: StatutPresence;
};

type RowProf = {
  personne_id: number;
  seance_id: number;
};

@Injectable()
export class MesSeancesQueryService {
  constructor(private readonly dataSource: DataSource) {}

  async getAdherents(userId: number, projectId: number) {
    const saisons: Array<{ id: number }> = await this.dataSource.query(
      `
      SELECT s.id
      FROM saison s
      WHERE s.project_id = $1
        AND s.active = true
      ORDER BY s.id
      `,
      [projectId],
    );

    if (saisons.length === 0) {
      return [];
    }

    const saisonId = saisons[0].id;

    const rows: Row[] = await this.dataSource.query(
      `
      WITH personnes_compte AS (
        SELECT
          p.id AS personne_id,
          $2::int AS saison_id,
          date_part('year', age(current_date, p.date_naissance))::int AS age,
          EXISTS (
            SELECT 1
            FROM inscription_saison i
            WHERE i.personne_id = p.id
              AND i.saison_id = $2
              AND i.active = true
          ) AS est_adherent
        FROM personne p
        WHERE p.compte = $1
          AND COALESCE(p.archive, false) = false
      ),

      groupes_personne AS (
        SELECT DISTINCT
          pc.personne_id,
          lg.groupe_id
        FROM personnes_compte pc
        JOIN lien_groupe lg
          ON lg.object_type = 'rider'
         AND lg.object_id = pc.personne_id
        JOIN groupes g
          ON g.id = lg.groupe_id
         AND g.saison_id = pc.saison_id
        WHERE pc.est_adherent = true
      ),

      groupes_seance AS (
        SELECT
          s.seance_id,
          array_agg(DISTINCT g.id ORDER BY g.id) AS groupe_ids,
          array_agg(DISTINCT g.nom ORDER BY g.nom) AS groupe_noms
        FROM seance s
        JOIN lien_groupe lg
          ON lg.object_type = 'séance'
         AND lg.object_id = s.seance_id
        JOIN groupes g
          ON g.id = lg.groupe_id
         AND g.saison_id = s.saison_id
        WHERE s.saison_id = $2
        GROUP BY s.seance_id
      ),

      seances_par_groupes AS (
        SELECT DISTINCT
          gp.personne_id,
          s.seance_id
        FROM groupes_personne gp
        JOIN lien_groupe lg
          ON lg.object_type = 'séance'
         AND lg.groupe_id = gp.groupe_id
        JOIN seance s
          ON s.seance_id = lg.object_id
         AND s.saison_id = $2
      ),

      /*
       * Un adhérent peut aussi consulter les prochaines séances des autres
       * groupes. Le front les masque par défaut et permet ensuite de choisir
       * un autre groupe via son filtre.
       */
      seances_autres_groupes AS (
        SELECT DISTINCT
          pc.personne_id,
          s.seance_id
        FROM personnes_compte pc
        JOIN groupes_seance gs ON true
        JOIN seance s
          ON s.seance_id = gs.seance_id
        WHERE pc.est_adherent = true
          AND s.saison_id = pc.saison_id
          AND s.statut = 'prévue'
          AND s.date_seance >= current_date
      ),

      seances_nominatives_inscrites AS (
        SELECT DISTINCT
          pc.personne_id,
          s.seance_id
        FROM personnes_compte pc
        JOIN inscription_seance ins
          ON ins.personne_id = pc.personne_id
        JOIN seance s
          ON s.seance_id = ins.seance_id
         AND s.saison_id = pc.saison_id
        WHERE s.convocation_nominative = true
      ),

      seances_inscrites_existantes AS (
        SELECT DISTINCT
          pc.personne_id,
          s.seance_id
        FROM personnes_compte pc
        JOIN inscription_seance ins
          ON ins.personne_id = pc.personne_id
        JOIN seance s
          ON s.seance_id = ins.seance_id
         AND s.saison_id = pc.saison_id
      ),

      inscription_stats AS (
        SELECT
          ins.seance_id,
          count(*) FILTER (
            WHERE ins.statut_inscription IN ('présent', 'convoqué', 'essai')
          )::int AS places_prises,
          count(*) FILTER (
            WHERE ins.statut_inscription = 'essai'
          )::int AS essais_pris
        FROM inscription_seance ins
        GROUP BY ins.seance_id
      ),

      /*
       * Hors club : uniquement les séances d'essai réellement accessibles.
       * Une borne d'âge renseignée est toujours effective. NULL signifie
       * explicitement « aucune limite » : les anciens flags est_limite_age_*
       * ne peuvent donc plus annuler silencieusement une valeur saisie.
       */
      seances_essai AS (
        SELECT DISTINCT
          pc.personne_id,
          s.seance_id
        FROM personnes_compte pc
        JOIN seance s
          ON s.saison_id = pc.saison_id
        LEFT JOIN inscription_stats stats
          ON stats.seance_id = s.seance_id
        WHERE pc.est_adherent = false
          AND s.essai_possible = true
          AND s.statut = 'prévue'
          AND s.date_seance >= current_date
          AND (
            s.age_minimum IS NULL
            OR s.age_minimum <= pc.age
          )
          AND (
            s.age_maximum IS NULL
            OR s.age_maximum >= pc.age
          )
          AND (
            COALESCE(s.est_place_maximum, false) = false
            OR s.place_maximum IS NULL
            OR COALESCE(stats.places_prises, 0) < s.place_maximum
          )
          AND (
            s.nb_essai_possible IS NULL
            OR COALESCE(stats.essais_pris, 0) < s.nb_essai_possible
          )
      ),

      seances_candidates AS (
        SELECT personne_id, seance_id FROM seances_par_groupes
        UNION
        SELECT personne_id, seance_id FROM seances_autres_groupes
        UNION
        SELECT personne_id, seance_id FROM seances_nominatives_inscrites
        UNION
        SELECT personne_id, seance_id FROM seances_inscrites_existantes
        UNION
        SELECT personne_id, seance_id FROM seances_essai
      )

      SELECT
        pc.personne_id,
        pc.est_adherent,
        EXISTS (
          SELECT 1
          FROM seances_par_groupes spg
          WHERE spg.personne_id = pc.personne_id
            AND spg.seance_id = s.seance_id
        ) AS dans_groupe_adherent,
        EXISTS (
          SELECT 1
          FROM seances_essai se
          WHERE se.personne_id = pc.personne_id
            AND se.seance_id = s.seance_id
        ) AS essai_disponible,
        (
          EXISTS (
            SELECT 1
            FROM seances_par_groupes spg
            WHERE spg.personne_id = pc.personne_id
              AND spg.seance_id = s.seance_id
          )
          OR EXISTS (
            SELECT 1
            FROM seances_nominatives_inscrites sni
            WHERE sni.personne_id = pc.personne_id
              AND sni.seance_id = s.seance_id
          )
          OR (
            ins.statut_inscription IS NOT NULL
            AND ins.statut_inscription <> 'essai'
          )
          OR (
            pc.est_adherent = true
            AND gs.seance_id IS NOT NULL
            AND (
              COALESCE(s.est_place_maximum, false) = false
              OR s.place_maximum IS NULL
              OR COALESCE(stats.places_prises, 0) < s.place_maximum
            )
          )
        ) AS acces_inscription,
        s.seance_id,
        gs.groupe_ids,
        gs.groupe_noms,
        ins.statut_inscription,
        ins.statut_seance AS statut_presence
      FROM personnes_compte pc
      JOIN seances_candidates sc
        ON sc.personne_id = pc.personne_id
      JOIN seance s
        ON s.seance_id = sc.seance_id
      LEFT JOIN groupes_seance gs
        ON gs.seance_id = s.seance_id
      LEFT JOIN inscription_stats stats
        ON stats.seance_id = s.seance_id
      LEFT JOIN inscription_seance ins
        ON ins.personne_id = pc.personne_id
       AND ins.seance_id = s.seance_id
      WHERE
        ins.personne_id IS NOT NULL
        OR (
          (
            s.age_minimum IS NULL
            OR s.age_minimum <= pc.age
          )
          AND (
            s.age_maximum IS NULL
            OR s.age_maximum >= pc.age
          )
        )
      ORDER BY pc.personne_id, s.date_seance, s.heure_debut, s.seance_id
      `,
      [userId, saisonId],
    );

    const byPerson = new Map<number, any>();

    for (const r of rows) {
      if (!byPerson.has(r.personne_id)) {
        byPerson.set(r.personne_id, {
          personne: {
            id: r.personne_id,
            inscrit: r.est_adherent,
          },
          mes_seances: [],
        });
      }

      byPerson.get(r.personne_id).mes_seances.push({
        seance: { id: r.seance_id },
        accesInscription: r.acces_inscription,
        dansGroupeAdherent: r.dans_groupe_adherent,
        essaiDisponible: r.essai_disponible,
        groupeIds: r.groupe_ids ?? [],
        groupeNoms: r.groupe_noms ?? [],
        statutInscription: r.statut_inscription ?? undefined,
        statutPrésence: r.statut_presence ?? undefined,
      });
    }

    return Array.from(byPerson.values());
  }

  async getProfs(userId: number, projectId: number) {
    const rows: RowProf[] = await this.dataSource.query(
      `
      WITH saison_active AS (
        SELECT s.id
        FROM saison s
        WHERE s.project_id = $2
          AND s.active = true
        LIMIT 1
      ),
      prof_contrats AS (
        SELECT
          cp.id AS professeurcontract_id,
          cp.professeur_id AS personne_id,
          sa.id AS saison_id
        FROM contrat_prof cp
        JOIN personne pe ON pe.id = cp.professeur_id
        JOIN saison_active sa ON sa.id = cp.saison_id
        WHERE pe.compte = $1
          AND pe.archive = false
      ),
      seances_prof AS (
        SELECT DISTINCT
          pc.personne_id,
          sp.seance_id
        FROM seance_professeur sp
        JOIN prof_contrats pc
          ON pc.professeurcontract_id = sp.professeurcontract_id
      )
      SELECT
        personne_id,
        seance_id
      FROM seances_prof
      ORDER BY personne_id, seance_id;
      `,
      [userId, projectId],
    );

    const byPerson = new Map<number, any>();

    for (const r of rows) {
      if (!byPerson.has(r.personne_id)) {
        byPerson.set(r.personne_id, {
          personne: { id: r.personne_id },
          mes_seances: [],
        });
      }

      byPerson.get(r.personne_id).mes_seances.push({
        seance: { id: r.seance_id },
      });
    }

    return Array.from(byPerson.values());
  }
}

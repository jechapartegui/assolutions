import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

type StatutInscription = 'présent' | 'absent' | 'convoqué' | 'essai' | null;
type StatutPresence = 'présent' | 'absent' | null;

type Row = {
  personne_id: number;
  seance_id: number;
  statut_inscription: StatutInscription;
  statut_presence: StatutPresence;
};
type RowProf = {
  personne_id: number; // professeur (personne)
  seance_id: number;
};

@Injectable()
export class MesSeancesQueryService {
  constructor(private readonly dataSource: DataSource) {}

async getAdherents(userId: number, projectId: number) {

  // 1) saison active
  const saisons: Array<{ id: number }> = await this.dataSource.query(
    `
    SELECT s.id
    FROM saison s
    WHERE s.project_id = $1
      AND s.active = true
    ORDER BY s.id
    `,
    [projectId]
  );

  if (saisons.length === 0) {
    return [];
  }

  const saisonId = saisons[0].id;

  // 2) résultat final
  const rows: Row[] = await this.dataSource.query(
    `
    WITH adherents AS (
      SELECT
        p.id AS personne_id,
        i.saison_id AS saison_id,
        date_part('year', age(current_date, p.date_naissance))::int AS age
      FROM personne p
      JOIN inscription_saison i ON i.personne_id = p.id
      WHERE p.compte = $1
        AND i.saison_id = $2
        AND i.active = true
    ),

    seances_par_groupes AS (
      SELECT DISTINCT
        gp.personne_id,
        s.seance_id AS seance_id
      FROM (
        SELECT
          a.personne_id,
          g.id AS groupe_id
        FROM adherents a
        JOIN lien_groupe lg
          ON lg.object_type = 'rider'
         AND lg.object_id = a.personne_id
        JOIN groupes g
          ON g.id = lg.groupe_id
         AND g.saison_id = a.saison_id
      ) gp
      JOIN lien_groupe lg2
        ON lg2.object_type = 'séance'
       AND lg2.groupe_id = gp.groupe_id
      JOIN seance s
        ON s.seance_id = lg2.object_id
    ),

    seances_nominatives_inscrites AS (
      SELECT DISTINCT
        a.personne_id,
        s.seance_id AS seance_id
      FROM adherents a
      JOIN inscription_seance ins
        ON ins.personne_id = a.personne_id
      JOIN seance s
        ON s.seance_id = ins.seance_id
       AND s.saison_id = a.saison_id
      WHERE s.convocation_nominative = true
    ),

    seances_candidates AS (
      SELECT * FROM seances_par_groupes
      UNION
      SELECT * FROM seances_nominatives_inscrites
    )

    SELECT
      a.personne_id,
      s.seance_id AS seance_id,
      ins.statut_inscription,
      ins.statut_seance AS statut_presence
    FROM adherents a
    JOIN seances_candidates sc ON sc.personne_id = a.personne_id
    JOIN seance s ON s.seance_id = sc.seance_id
    LEFT JOIN inscription_seance ins
      ON ins.personne_id = a.personne_id
     AND ins.seance_id = s.seance_id
    WHERE
      (s.est_limite_age_minimum = false OR (s.est_limite_age_minimum = true AND s.age_minimum <= a.age))
      AND
      (s.est_limite_age_maximum = false OR (s.est_limite_age_maximum = true AND s.age_maximum >= a.age))
    ORDER BY a.personne_id, s.seance_id
    `,
    [userId, saisonId]
  );

  // 3) groupement final
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
        AND (pe.archive = false)
    ),
    seances_prof AS (
      SELECT DISTINCT
        pc.personne_id,
        sp.seance_id
      FROM seance_professeur sp
      JOIN prof_contrats pc ON pc.professeurcontract_id = sp.professeurcontract_id
    )
    SELECT
      personne_id,
      seance_id
    FROM seances_prof
    ORDER BY personne_id, seance_id;
    `,
    [userId, projectId]
  );

  // regroupe -> AdherentSeance_VM[] minimal (IDs only)
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
      // statutInscription / statutPrésence absents côté prof pour l’instant
    });
  }

  return Array.from(byPerson.values());
}
}
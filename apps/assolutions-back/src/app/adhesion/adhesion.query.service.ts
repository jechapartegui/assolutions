import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProjetView } from '@shared/index';
export type ligneSaison = {
  id: number;
  nom: string;
  date_debut: string; // ou Date selon ton mapping
  date_fin: string;
};


type ProjectRow = {
  project_id: number;
  project_nom: string;
  saison_id: number | null;
  saison_nom: string | null;
  saison_date_debut: string | null;
  saison_date_fin: string | null;
  visible: boolean;
  has_active_inscription: boolean;
  has_prof_contract: boolean;
};

@Injectable()
export class AdhesionQueryService {
 constructor(private readonly dataSource: DataSource) {}

async getAdhesion(compteId: number): Promise<ProjetView[]> {
  const sql = `
SELECT
  pr.id        AS project_id,
  pr.nom       AS project_nom,

  s.id         AS saison_id,
  s.nom        AS saison_nom,
  s.date_debut AS saison_date_debut,
  s.date_fin   AS saison_date_fin,

  true AS visible,

  COALESCE(BOOL_OR(ins.id IS NOT NULL AND ins.active = true), false) AS has_active_inscription,
  COALESCE(BOOL_OR(cp.id IS NOT NULL), false) AS has_prof_contract

FROM login_project lp

JOIN project pr
  ON pr.id = lp.project_id
 AND pr.actif = true

LEFT JOIN saison s
  ON s.project_id = pr.id
 AND s.active = true

LEFT JOIN personne pe_ins
  ON pe_ins.compte = lp.login_id
 AND pe_ins.archive = false

LEFT JOIN inscription_saison ins
  ON ins.personne_id = pe_ins.id
 AND ins.saison_id = s.id

LEFT JOIN personne pe_prof
  ON pe_prof.compte = lp.login_id
 AND pe_prof.archive = false

LEFT JOIN contrat_prof cp
  ON cp.professeur_id = pe_prof.id
 AND cp.saison_id = s.id

WHERE lp.login_id = $1

GROUP BY
  pr.id,
  pr.nom,
  s.id,
  s.nom,
  s.date_debut,
  s.date_fin

ORDER BY pr.nom;
`;

  const rows = (await this.dataSource.query(sql, [compteId])) as ProjectRow[];

  return rows.map((r) => ({
    id: r.project_id,
    nom: r.project_nom,
    rights: {
      visible: true,
      adherent: r.has_active_inscription === true,
      prof: r.has_prof_contract === true,
      essai: false, // à définir selon ta logique métier
    },
    saison_active: r.saison_id
      ? {
          id: r.saison_id,
          nom: r.saison_nom ?? '',
          date_debut: r.saison_date_debut ?? '',
          date_fin: r.saison_date_fin ?? '',
          project_id: r.project_id,
        }
      : null,
  }));
}

  async getAnniversaire(saisonId: number): Promise<string[]> {
    const today = new Date();
    const sql = `SELECT p.first_name || ' ' || p.last_name AS nom FROM personne p
JOIN inscription_saison ins ON ins.personne_id = p.id
WHERE ins.saison_id = $1 AND p.date_naissance IS NOT NULL 
AND EXTRACT(MONTH FROM p.date_naissance) = EXTRACT(MONTH FROM $2::date)
AND EXTRACT(DAY FROM p.date_naissance)   = EXTRACT(DAY FROM $2::date)`;
    const rows = (await this.dataSource.query(sql, [saisonId, today])) as any[];
    return rows.map(r => r.nom);  
  }
}
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
export type ligneSaison = {
  id: number;
  nom: string;
  date_debut: string; // ou Date selon ton mapping
  date_fin: string;
};

export type ProjectRights = {
  adherent: boolean;
  prof: boolean;
  essai: boolean;
};

export type ProjetView = {
  id: number;
  nom: string;
  rights: ProjectRights;
  saison_active: ligneSaison | null;
};

type ProjectRow = {
  project_id: number;
  project_nom: string;
  saison_id: number | null;
  saison_nom: string | null;
  saison_date_debut: string | null;
  saison_date_fin: string | null;
  has_active_inscription: boolean;
  has_prof_contract: boolean;
  inscription_count: number;
};


@Injectable()
export class AdhesionQueryService {
 constructor(private readonly dataSource: DataSource) {}

  async getAdhesion(compteId: number): Promise<ProjetView[]> {
  const sql = `SELECT
  pr.id            AS project_id,
  pr.nom           AS project_nom,
  s.id             AS saison_id,
  s.nom            AS saison_nom,
  s.date_debut     AS saison_date_debut,
  s.date_fin       AS saison_date_fin,

  -- Adhérent/essai
  COALESCE(BOOL_OR(ins.active), false) AS has_active_inscription,
  COUNT(ins.id) FILTER (WHERE pe_ins.id IS NOT NULL) AS inscription_count,

  -- Prof
  BOOL_OR(cp.id IS NOT NULL) AS has_prof_contract

FROM project pr
JOIN saison s
  ON s.project_id = pr.id
 AND s.active = true

LEFT JOIN inscription_saison ins
  ON ins.saison_id = s.id
LEFT JOIN personne pe_ins
  ON pe_ins.id = ins.personne_id
 AND pe_ins.compte = $1
 AND pe_ins.archive = false

LEFT JOIN contrat_prof cp
  ON cp.saison_id = s.id
LEFT JOIN personne pe_prof
  ON pe_prof.id = cp.professeur_id
 AND pe_prof.compte = $1
 AND pe_prof.archive = false

WHERE pr.actif = true
GROUP BY pr.id, pr.nom, s.id, s.nom, s.date_debut, s.date_fin;
`;

    const rows = (await this.dataSource.query(sql, [compteId])) as ProjectRow[];

return rows
  // optionnel : si tu veux exclure les projets où tu n'es ni prof ni adhérent/essai
  .filter(r => r.has_prof_contract || r.has_active_inscription !== null)
  .map((r) => ({
    id: r.project_id,
    nom: r.project_nom,
    rights: {
  adherent: r.has_active_inscription === true,
  prof: r.has_prof_contract === true,
  essai: r.has_active_inscription === false && Number(r.inscription_count) > 0,
},
    saison_active: r.saison_id
      ? {
          id: r.saison_id,
          nom: r.saison_nom ?? '',
          date_debut: r.saison_date_debut ?? '',
          date_fin: r.saison_date_fin ?? '',
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
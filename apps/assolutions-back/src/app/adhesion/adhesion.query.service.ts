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
};


@Injectable()
export class AdhesionQueryService {
 constructor(private readonly dataSource: DataSource) {}

  async getAdhesion(compteId: number): Promise<ProjetView[]> {
    const sql = `
      SELECT DISTINCT ON (pr.id)
        pr.id            AS project_id,
        pr.nom           AS project_nom,
        s.id             AS saison_id,
        s.nom            AS saison_nom,
        s.date_debut     AS saison_date_debut,
        s.date_fin       AS saison_date_fin
      FROM project pr
      JOIN saison s
        ON s.project_id = pr.id
       AND s.active = true
      JOIN inscription_saison ins
        ON ins.saison_id = s.id
       AND ins.active = true
      JOIN personne pe
        ON pe.id = ins.personne_id
       AND pe.compte = $1
       AND pe.archive = false
      WHERE pr.actif = true
      ORDER BY pr.id, s.date_debut DESC;
    `;

    const rows = await this.dataSource.query(sql, [compteId]) as ProjectRow[];

    return rows.map((r) => ({
      id: r.project_id,
      nom: r.project_nom,
      rights: {
        adherent: true,
        prof: false,
        essai: false,
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
}

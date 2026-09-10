import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { FfrsExportResult, FfrsExportService } from './ffrs-export.service';

type MedicalProofRow = {
  personne_id: number;
  date_document: string | Date | null;
  medecin_nom: string | null;
  medecin_rpps: string | null;
};

type OrderedPersonRow = {
  id: number;
};

/**
 * Extension volontairement isolée de l'export FFRS historique.
 *
 * Les colonnes officielles existantes et leur ordre restent gérés par
 * FfrsExportService. On ajoute uniquement les informations du certificat
 * médical à la fin du fichier afin de ne pas casser le format déjà utilisé.
 */
@Injectable()
export class FfrsExportMedicalService extends FfrsExportService {
  constructor(
    private readonly exportDataSource: DataSource,
    config: ConfigService,
  ) {
    super(exportDataSource, config);
  }

  async build(
    rawIds: number[],
    projectId: number,
    saisonId: number | null,
    publicBaseUrl: string,
  ): Promise<FfrsExportResult> {
    const result = await super.build(
      rawIds,
      projectId,
      saisonId,
      publicBaseUrl,
    );

    const headers = [
      ...result.headers,
      'RPPS',
      'Nom du médecin',
      'Date du certificat',
    ];

    if (!result.rows.length) {
      return { ...result, headers };
    }

    const ids = [
      ...new Set(
        (rawIds ?? [])
          .map(Number)
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];

    if (!ids.length) {
      return {
        ...result,
        headers,
        rows: result.rows.map((row) => [...row, '', '', '']),
      };
    }

    // FfrsExportService trie les personnes par nom, prénom puis id. On refait
    // uniquement cette sélection d'identifiants pour rattacher sans ambiguïté
    // la preuve médicale à la bonne ligne du tableau déjà construit.
    const orderedPersons = (await this.exportDataSource.query(
      `
        SELECT p.id
        FROM personne p
        INNER JOIN login_project lp
          ON lp.login_id = p.compte
         AND lp.project_id = $1
        WHERE p.id = ANY($2::int[])
        ORDER BY p.last_name, p.first_name, p.id
      `,
      [projectId, ids],
    )) as OrderedPersonRow[];

    // Un certificat actif peut rester valable d'une saison à l'autre. On prend
    // donc le certificat CERTIFICAT actif le plus récent, et jamais un QS_SPORT.
    const medicalProofs = (await this.exportDataSource.query(
      `
        SELECT DISTINCT ON (pm.personne_id)
               pm.personne_id,
               pm.date_document,
               pm.medecin_nom,
               pm.medecin_rpps
        FROM preuve_medicale pm
        WHERE pm.project_id = $1
          AND pm.personne_id = ANY($2::int[])
          AND pm.type_preuve = 'CERTIFICAT'
          AND COALESCE(pm.valide, false) = true
        ORDER BY
          pm.personne_id,
          pm.date_document DESC,
          COALESCE(pm.updated_at, pm.created_at) DESC,
          pm.id DESC
      `,
      [projectId, ids],
    )) as MedicalProofRow[];

    const proofByPerson = new Map(
      medicalProofs.map((proof) => [Number(proof.personne_id), proof]),
    );

    const rows = result.rows.map((row, index) => {
      const personId = Number(orderedPersons[index]?.id ?? 0);
      const proof = proofByPerson.get(personId);

      // Compatibilité avec les anciens certificats qui existaient uniquement
      // comme document : la date déjà calculée par l'export historique reste le
      // fallback, tandis que médecin/RPPS ne sont ajoutés que s'ils sont saisis.
      const certificateDate =
        proof?.date_document ??
        result.medicalCertificateDates[personId] ??
        null;

      return [
        ...row,
        this.text(proof?.medecin_rpps, 20),
        this.text(proof?.medecin_nom, 150),
        this.formatMedicalDate(certificateDate),
      ];
    });

    return {
      ...result,
      headers,
      rows,
    };
  }

  private text(value: string | null | undefined, maxLength: number): string {
    return String(value ?? '').trim().slice(0, maxLength);
  }

  /**
   * node-postgres peut restituer une colonne PostgreSQL DATE sous forme de
   * Date JavaScript. String(date).slice(0, 10) produit alors par exemple
   * "Thu Sep 10" et l'ancien parseur rejetait systématiquement la valeur.
   * On gère donc explicitement les deux représentations possibles.
   */
  private formatMedicalDate(
    value: string | Date | null | undefined,
  ): string {
    if (!value) return '';

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return '';
      const dd = String(value.getDate()).padStart(2, '0');
      const mm = String(value.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${value.getFullYear()}`;
    }

    const raw = String(value).trim().slice(0, 10);
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
  }
}

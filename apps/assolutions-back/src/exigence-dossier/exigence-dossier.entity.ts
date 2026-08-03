import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'exigence_dossier' })
export class ExigenceDossierEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  project_id: number;

  @Column({ type: 'int', nullable: true })
  saison_id: number | null;

  @Column({ type: 'varchar', length: 80 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  libelle: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, default: 'INSCRIPTION' })
  usage: 'INSCRIPTION' | 'LICENCE';

  @Column({ type: 'varchar', length: 30 })
  type_exigence:
    | 'CHAMP_PERSONNE'
    | 'CONTACT'
    | 'DOCUMENT'
    | 'PREUVE_MEDICALE'
    | 'CONSENTEMENT'
    | 'DECLARATION';

  @Column({ type: 'varchar', length: 100, nullable: true })
  source_code: string | null;

  @Column({ type: 'varchar', length: 20, default: 'AUCUNE' })
  type_reponse: 'AUCUNE' | 'BOOLEEN' | 'TEXTE' | 'DATE' | 'DOCUMENT';

  @Column({ type: 'boolean', default: true })
  obligatoire: boolean;

  @Column({ type: 'boolean', default: true })
  bloquante: boolean;

  @Column({ type: 'int', nullable: true })
  age_min: number | null;

  @Column({ type: 'int', nullable: true })
  age_max: number | null;

  @Column({ type: 'int', nullable: true })
  validite_mois: number | null;

  @Column({ type: 'text', nullable: true })
  texte_consentement: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  version_texte: string | null;

  @Column({ type: 'int', default: 0 })
  ordre: number;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @Column({ type: 'timestamp', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date | null;
}

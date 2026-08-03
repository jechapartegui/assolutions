import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'reponse_exigence_dossier' })
export class ReponseExigenceDossierEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'int' })
  exigence_id: number;

  @Column({ type: 'int' })
  personne_id: number;

  @Column({ type: 'int' })
  saison_id: number;

  @Column({ type: 'int', nullable: true })
  souscription_personne_id: number | null;

  @Column({ type: 'varchar', length: 30, default: 'SAISON' })
  contexte_type: 'SAISON' | 'SOUSCRIPTION' | 'LICENCE';

  @Column({ type: 'int', nullable: true })
  contexte_id: number | null;

  @Column({ type: 'boolean', nullable: true })
  valeur_boolean: boolean | null;

  @Column({ type: 'text', nullable: true })
  valeur_texte: string | null;

  @Column({ type: 'date', nullable: true })
  valeur_date: string | null;

  @Column({ type: 'int', nullable: true })
  document_id: number | null;

  @Column({ type: 'text', nullable: true })
  texte_accepte: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  version_acceptee: string | null;

  @Column({ type: 'int', nullable: true })
  repondu_par_personne_id: number | null;

  @Column({ type: 'timestamp', default: () => 'now()' })
  date_reponse: Date;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date | null;
}

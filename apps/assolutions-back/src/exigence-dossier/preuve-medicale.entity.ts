import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'preuve_medicale' })
export class PreuveMedicaleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  project_id: number;

  @Column({ type: 'int' })
  personne_id: number;

  @Column({ type: 'int' })
  saison_id: number;

  @Column({ type: 'varchar', length: 30 })
  type_preuve: 'CERTIFICAT' | 'QS_SPORT';

  @Column({ type: 'date' })
  date_document: string;

  @Column({ type: 'boolean', nullable: true })
  qs_reponses_negatives: boolean | null;

  @Column({ type: 'boolean', default: false })
  valable_competition: boolean;

  @Column({ type: 'varchar', length: 150, nullable: true })
  medecin_nom: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  medecin_rpps: string | null;

  @Column({ type: 'int', nullable: true })
  document_id: number | null;

  @Column({ type: 'boolean', default: true })
  valide: boolean;

  @Column({ type: 'text', nullable: true })
  commentaire: string | null;

  @Column({ type: 'timestamp', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date | null;
}

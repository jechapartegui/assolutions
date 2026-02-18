import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'cours' })
export class CoursEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  project_id: number;

  @Column({ type: 'varchar', length: 255 })
  nom: string;

  @Column({ type: 'varchar', length: 20 })
  jour_semaine: string;

  @Column({ type: 'varchar', length: 10 })
  heure: string;

  @Column({ type: 'int' })
  duree: number;

  @Column({ type: 'int' })
  prof_principal_id: number;

  @Column({ type: 'int' })
  lieu_id: number;

  @Column({ type: 'int', nullable: true })
  age_minimum: number | null;

  @Column({ type: 'int', nullable: true })
  age_maximum: number | null;

  @Column({ type: 'int' })
  saison_id: number;

  @Column({ type: 'int', nullable: true })
  place_maximum: number | null;

  @Column({ type: 'boolean', default: false })
  convocation_nominative: boolean;

  @Column({ type: 'boolean', default: false })
  afficher_present: boolean;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_creation: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_maj: Date;

  @Column({ type: 'boolean', default: false })
  essai_possible: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  appointment: string | null;
}

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'seance' })
export class SeanceEntity {
  @PrimaryGeneratedColumn({ name: 'seance_id' })
  seance_id: number;

  @Column({ type: 'int' })
  saison_id: number;

  @Column({ type: 'int', nullable: true })
  cours: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ type: 'enum', enumName: 'seance_type_seance_enum' } as any)
  type_seance: string;

  @Column({ type: 'date' })
  date_seance: string;

  @Column({ type: 'varchar', length: 10 })
  heure_debut: string;

  @Column({ type: 'int' })
  duree_seance: number;

  @Column({ type: 'int' })
  lieu_id: number;

  @Column({ type: 'enum', enumName: 'seance_statut_enum' } as any)
  statut: string;

  @Column({ type: 'int', nullable: true })
  age_minimum: number | null;

  @Column({ type: 'int', nullable: true })
  age_maximum: number | null;

  @Column({ type: 'int', nullable: true })
  place_maximum: number | null;

  @Column({ type: 'boolean', default: false })
  essai_possible: boolean;

  @Column({ type: 'int', nullable: true })
  nb_essai_possible: number | null;

  @Column({ type: 'text', nullable: true })
  info_seance: string | null;

  @Column({ type: 'boolean', default: false })
  convocation_nominative: boolean;

  @Column({ type: 'boolean', default: false })
  afficher_present: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  appointment: string | null;

  @Column({ type: 'boolean', default: false })
  est_limite_age_minimum: boolean;

  @Column({ type: 'boolean', default: false })
  est_limite_age_maximum: boolean;

  @Column({ type: 'boolean', default: false })
  est_place_maximum: boolean;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_creation: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_maj: Date;
}

import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'professeur' })
export class ProfesseurEntity {
  @PrimaryColumn({ type: 'int' })
  id: number; // = personne.id

  @Column({ type: 'double precision', nullable: true })
  hourly_rate: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  status: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  num_tva: string | null;

  @Column({ type: 'int', nullable: true })
  num_siren: number | null;

  @Column({ type: 'varchar', length: 34, nullable: true })
  iban: string | null;

  @Column({ type: 'text', nullable: true })
  info: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_creation: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_maj: Date;

  @Column({ type: 'int' })
  project_id: number;
}

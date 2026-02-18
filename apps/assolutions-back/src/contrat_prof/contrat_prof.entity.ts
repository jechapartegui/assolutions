import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'contrat_prof' })
export class ContratProfEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  saison_id: number;

  @Column({ type: 'int' })
  professeur_id: number;

  @Column({ type: 'varchar', length: 50 })
  type_contrat: string;

  @Column({ type: 'varchar', length: 50 })
  type_remuneration: string;

  @Column({ type: 'date' })
  date_debut: string;

  @Column({ type: 'date', nullable: true })
  date_fin: string | null;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_creation: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_maj: Date;
}

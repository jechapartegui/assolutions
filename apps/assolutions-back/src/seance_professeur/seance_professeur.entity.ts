import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'seance_professeur' })
export class SeanceProfesseurEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  seance_id: number;

  @Column({ type: 'int' })
  minutes: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  cout: string | null; // numeric => string safe

  @Column({ type: 'text', nullable: true })
  info: string | null;

  @Column({ type: 'timestamp', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'now()' })
  updated_at: Date;

  @Column({ type: 'int' })
  professeurcontract_id: number;

  @Column({ type: 'enum', enumName: 'seance_professeur_statut_enum', default: () => `'prévue'` } as any)
  statut: string;
}

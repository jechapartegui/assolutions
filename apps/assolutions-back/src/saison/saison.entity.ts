import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'saison' })
export class SaisonEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10 })
  nom: string;

  @Column({ type: 'boolean', default: false })
  active: boolean;

  @Column({ type: 'int' })
  project_id: number;

  @Column({ type: 'date' })
  date_debut: string;

  @Column({ type: 'date' })
  date_fin: string;

  @Column({ type: 'int' })
  saison_precedente: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_creation: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_maj: Date;
}

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'compte_bancaire' })
export class CompteBancaireEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  project_id: number;

  @Column({ type: 'varchar', length: 255 })
  nom: string;

  @Column({ type: 'varchar', length: 255 })
  type: string;

  @Column({ type: 'text', nullable: true })
  info: string | null;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @Column({ type: 'varchar', length: 34, nullable: true })
  iban: string | null;

  @Column({ type: 'text', nullable: true })
  carte_json: string | null;

  @Column({ type: 'int', nullable: true })
  carte_titulaire: number | null;
}

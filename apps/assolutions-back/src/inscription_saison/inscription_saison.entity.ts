import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'inscription_saison' })
export class InscriptionSaisonEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  saison_id: number;

  @Column({ type: 'int' })
  personne_id: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_inscription: Date;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}

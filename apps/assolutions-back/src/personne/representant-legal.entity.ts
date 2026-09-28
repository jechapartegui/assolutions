import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'representant_legal' })
@Index('idx_representant_legal_personne', ['personne_id'])
export class RepresentantLegalEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  personne_id: number;

  @Column({ type: 'varchar', length: 100 })
  nom: string;

  @Column({ type: 'varchar', length: 100 })
  prenom: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 50 })
  telephone: string;

  @Column({ type: 'smallint', default: 1 })
  ordre: number;
}

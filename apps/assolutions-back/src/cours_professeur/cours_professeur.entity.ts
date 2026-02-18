import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'cours_professeur' })
export class CoursProfesseurEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  cours_id: number;

  @Column({ type: 'int' })
  contrat_id: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_creation: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_maj: Date;
}

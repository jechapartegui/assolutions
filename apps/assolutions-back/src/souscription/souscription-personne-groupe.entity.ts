import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'souscription_personne_groupe' })
export class SouscriptionPersonneGroupeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  souscription_personne_id: number;

  @Column({ type: 'int' })
  groupe_id: number;

  @Column({ type: 'timestamp', default: () => 'now()' })
  created_at: Date;
}

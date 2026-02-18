import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'groupes' })
export class GroupesEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nom: string;

  @Column({ type: 'int' })
  saison_id: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_creation: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_maj: Date;

  @Column({ type: 'varchar', length: 250, nullable: true })
  whatsapp: string | null;

  @Column({ type: 'boolean', nullable: true })
  visible: boolean | null;
}

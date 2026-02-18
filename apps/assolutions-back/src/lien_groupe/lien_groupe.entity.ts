import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'lien_groupe' })
export class LienGroupeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  groupe_id: number;

  @Column({ type: 'int' })
  object_id: number;

  @Column({ type: 'varchar', length: 50 })
  object_type: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_creation: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_maj: Date;
}

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'lieu' })
export class LieuEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  project_id: number;

  @Column({ type: 'varchar', length: 255 })
  nom: string;

  @Column({ type: 'text' })
  adresse: string;

  @Column({ type: 'boolean', default: false })
  public: boolean;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_creation: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_maj: Date;
}

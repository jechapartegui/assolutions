import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'personne' })
export class PersonneEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date_naissance: string;

  @Column({ type: 'int' })
  compte: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_creation: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_maj: Date;

  @Column({ type: 'varchar', length: 100 })
  last_name: string;

  @Column({ type: 'varchar', length: 100 })
  first_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname: string | null;

  @Column({ type: 'boolean', default: false })
  gender: boolean;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'boolean', default: false })
  archive: boolean;
}

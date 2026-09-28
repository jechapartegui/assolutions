import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CompteEntity } from '../compte/compte.entity';

@Entity({ name: 'personne' })
export class PersonneEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', nullable: true })
  date_naissance: string | null;

  @Column({ type: 'int' })
  compte: number;

  @ManyToOne(() => CompteEntity, { nullable: true })
  @JoinColumn({ name: 'compte' })
  compte_rel?: CompteEntity;

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

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: 'France' })
  pays: string | null;

  @Column({ type: 'boolean', default: false })
  archive: boolean;
}

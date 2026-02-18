import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'registry' })
export class RegistryEntity {
  // bigserial -> bigint ; TypeORM renvoie souvent string en JS
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  entity_type: string;

  @Column({ type: 'int' })
  entity_id: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at: Date;
}

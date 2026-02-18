import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'addinfo' })
export class AddinfoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  object_id: number;

  @Column({ type: 'varchar', length: 50 })
  object_type: string;

  @Column({ type: 'varchar', length: 50 })
  value_type: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'int', nullable: true })
  project_id: number | null;
}

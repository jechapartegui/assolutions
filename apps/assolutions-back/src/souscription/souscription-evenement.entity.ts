import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'souscription_evenement' })
export class SouscriptionEvenementEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'int' })
  souscription_id: number;

  @Column({ type: 'varchar', length: 80 })
  type_evenement: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @Column({ type: 'timestamp', default: () => 'now()' })
  created_at: Date;
}

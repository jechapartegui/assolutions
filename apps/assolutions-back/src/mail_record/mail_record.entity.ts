import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type MailRecordStatus = 'SENT' | 'FAILED';

@Entity({ name: 'mail_record' })
export class MailRecordEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  record: string;

  @Column({ name: 'to', type: 'varchar', length: 200 })
  to: string;

  @Column({ type: 'varchar', length: 200 })
  subject: string;

  @Column({ name: 'project_id', type: 'int', nullable: true })
  project_id?: number | null;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at?: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'SENT' })
  status: MailRecordStatus;

  @Column({ type: 'text', nullable: true })
  error?: string | null;
}

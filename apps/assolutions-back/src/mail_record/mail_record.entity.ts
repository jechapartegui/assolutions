import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'mail_record' })
export class MailRecordEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  record: string;

  @Column({ type: 'varchar', length: 200, name: 'to' })
  to: string;

  @Column({ type: 'varchar', length: 200 })
  subject: string;

  @Column({ type: 'int', nullable: true })
  project_id: number | null;
}

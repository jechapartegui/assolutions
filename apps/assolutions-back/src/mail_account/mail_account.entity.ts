import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'mail_account' })
export class MailAccountEntity {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 150 })
  label: string;

  @Column({ type: 'varchar', length: 200, default: 'smtp.gmail.com' })
  host: string;

  @Column({ type: 'int', default: 587 })
  port: number;

  @Column({ type: 'boolean', default: false })
  secure: boolean;

  @Column({ type: 'varchar', length: 200 })
  username: string;

  @Column({ type: 'text' })
  password_enc: string;

  @Column({ type: 'varchar', length: 200 })
  from_email: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  from_name: string | null;

  @Column({ type: 'int', default: 30 })
  max_per_minute: number;
}

import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('mail_account')
export class MailAccount {
  @Index({ unique: true })
  @PrimaryColumn()
  id!: number;

  @Column({ type: 'varchar', length: 150 })
  label!: string;

  // SMTP Gmail (mot de passe application)
  @Column({ type: 'varchar', length: 200, default: 'smtp.gmail.com' })
  host!: string;

  @Column({ type: 'int', default: 587 })
  port!: number;

  @Column({ type: 'boolean', default: false })
  secure!: boolean; // false => STARTTLS (587), true => 465

  @Column({ type: 'varchar', length: 200 })
  username!: string; // ton.email@gmail.com

  @Column({ type: 'text' })
  password_enc!: string; // mot de passe application CHIFFRÉ

  // Expéditeur par défaut
  @Column({ type: 'varchar', length: 200 })
  from_email!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  from_name!: string | null;

  // Limite d’envoi
  @Column({ type: 'int', default: 30 })
  max_per_minute!: number;
}

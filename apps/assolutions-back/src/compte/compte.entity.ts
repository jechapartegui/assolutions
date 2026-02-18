import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'compte' })
export class CompteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  login: string;

  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @Column({ type: 'boolean', default: false })
  mail_actif: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  derniere_connexion: Date | null;

  @Column({ type: 'boolean', default: false })
  echec_connexion: boolean;

  @Column({ type: 'boolean', default: false })
  mail_ko: boolean;

  @Column({ type: 'text', nullable: true })
  activation_token: string | null;
}

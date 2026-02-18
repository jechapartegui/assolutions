import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'mail_project' })
export class MailProjectEntity {
  @PrimaryColumn({ type: 'int' })
  id: number; // probablement project_id

  @Column({ type: 'text' })
  mail_relance: string;

  @Column({ type: 'text' })
  mail_annulation: string;

  @Column({ type: 'text' })
  mail_convocation: string;

  @Column({ type: 'text' })
  mail_essai: string;

  @Column({ type: 'varchar', length: 100 })
  sujet_relance: string;

  @Column({ type: 'varchar', length: 100 })
  sujet_annulation: string;

  @Column({ type: 'varchar', length: 100 })
  sujet_convocation: string;

  @Column({ type: 'varchar', length: 100 })
  sujet_essai: string;

  @Column({ type: 'text' })
  mail_vide: string;

  @Column({ type: 'text', default: '' })
  mail_bienvenue: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  sujet_bienvenue: string;

  @Column({ type: 'text', default: '' })
  mail_serie_seance: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  sujet_serie_seance: string;
}

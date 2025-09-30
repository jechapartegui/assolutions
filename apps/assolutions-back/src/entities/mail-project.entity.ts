import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('mail_project')
export class MailProject {
  @Index({ unique: true })
  @PrimaryColumn()
  id!: number;

    @Column({ type: 'text' })
  mail_relance!: string;
  
    @Column({ type: 'text' })
  mail_annulation!: string;
  
    @Column({ type: 'text' })
  mail_convocation!: string;

    @Column({ type: 'text' })
  mail_essai!: string;

    @Column({ type: 'text', nullable: true, default: '' })
  mail_bienvenue!: string;

    @Column({ type: 'text', nullable: true, default: '' })
  mail_serie_seance!: string;

    @Column({ type: 'text' })
  mail_vide!: string;

   @Column({ type: 'varchar', length:100 })
  sujet_relance!: string;

   @Column({ type: 'varchar', length:100 })
  sujet_annulation!: string;
  
   @Column({ type: 'varchar', length:100 })
  sujet_convocation!: string;
  
   @Column({ type: 'varchar', length:100 })
  sujet_essai!: string;
   @Column({ type: 'varchar', length:100, default: '' })
  sujet_serie_seance!: string;
   @Column({ type: 'varchar', length:100, default: '' })
  sujet_bienvenue!: string;

}
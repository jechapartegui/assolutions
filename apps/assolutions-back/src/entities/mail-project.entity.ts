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

}
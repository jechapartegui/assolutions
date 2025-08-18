import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * Représente un groupe de participants pour une saison.
 */
@Entity({ name: 'mail_record' })
export class MailRecord {
  @PrimaryGeneratedColumn()
  id: number;

     @Column({ type: 'varchar', length:200 })
  record!: string;

     @Column({ type: 'varchar', length:200 })
  to!: string;

}
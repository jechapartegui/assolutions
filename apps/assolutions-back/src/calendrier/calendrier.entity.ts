import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'calendrier' })
export class CalendrierEntity {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int' }) project_id: number;
  @Column({ type: 'int' }) saison_id: number;
  @Column({ type: 'varchar', length: 255 }) nom: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 64, default: 'Europe/Paris' }) timezone: string;
  @Column({ type: 'boolean', default: false }) notifier_mises_a_jour: boolean;
  @Column({ type: 'boolean', default: true }) actif: boolean;
  @Column({ type: 'text', nullable: true }) google_calendar_id: string | null;
  @Column({ type: 'text', nullable: true }) google_calendar_url: string | null;
  @Column({ type: 'varchar', length: 24, default: 'LOCAL_ONLY' }) statut_synchro: string;
  @Column({ type: 'timestamptz', nullable: true }) derniere_synchro: Date | null;
  @Column({ type: 'text', nullable: true }) derniere_erreur: string | null;
  @Column({ type: 'timestamptz', default: () => 'now()' }) date_creation: Date;
  @Column({ type: 'timestamptz', default: () => 'now()' }) date_maj: Date;
}

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'calendrier_evenement' })
export class CalendrierEvenementEntity {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int' }) calendrier_id: number;
  @Column({ type: 'int', nullable: true }) seance_id: number | null;
  @Column({ type: 'text', nullable: true }) google_event_id: string | null;
  @Column({ type: 'text', nullable: true }) google_etag: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) contenu_hash: string | null;
  @Column({ type: 'varchar', length: 24, default: 'PENDING' }) statut_synchro: string;
  @Column({ type: 'int', default: 0 }) tentatives: number;
  @Column({ type: 'timestamptz', nullable: true }) derniere_synchro: Date | null;
  @Column({ type: 'text', nullable: true }) derniere_erreur: string | null;
  @Column({ type: 'timestamptz', default: () => 'now()' }) date_creation: Date;
  @Column({ type: 'timestamptz', default: () => 'now()' }) date_maj: Date;
}

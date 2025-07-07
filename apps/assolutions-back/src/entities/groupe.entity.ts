import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Season } from './saison.entity';

/**
 * Représente un groupe de participants pour une saison.
 */
@Entity({ name: 'groupes' })
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  /** Nom du groupe */
  @Column({ length: 100, name: 'nom' })
  name: string;

  /** Référence vers la saison */
  @Column({ name: 'saison_id' })
  seasonId: number;

  @ManyToOne(() => Season, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saison_id' })
  season: Season;

  /** Date de création automatique */
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'date_creation' })
  createdAt: Date;

  /** Date de mise à jour automatique */
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'date_maj' })
  updatedAt: Date;
}

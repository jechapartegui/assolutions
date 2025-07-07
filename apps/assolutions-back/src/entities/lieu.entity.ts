import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Project } from './projet.entity';

/**
 * Représente un lieu associé à un projet.
 */
@Entity({ name: 'lieu' })
export class Location {
  @PrimaryGeneratedColumn()
  id: number;

  /** Référence vers le projet parent */
  @Column({ name: 'project_id' })
  projectId: number;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  /** Nom du lieu */
  @Column({ length: 255, name: 'nom' })
  name: string;

  /** Adresse complète */
  @Column({ type: 'text', name: 'adresse' })
  address: string;

  /** Indique si le lieu est public */
  @Column({ type: 'boolean', default: false, name: 'public' })
  isPublic: boolean;

  /** Date de création automatique */
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'date_creation' })
  createdAt: Date;

  /** Date de mise à jour automatique */
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'date_maj' })
  updatedAt: Date;
}

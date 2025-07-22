import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Project } from './projet.entity';
import {  RegistrationSeason } from './inscription-saison.entity';

/**
 * Représente une saison liée à un projet.
 */
@Entity({ name: 'saison' })
export class Season {
  @PrimaryGeneratedColumn()
  id: number;

  /** Nom court de la saison */
  @Column({ length: 10, name: 'nom' })
  name: string;

  /** Statut actif/inactif */
  @Column({ type: 'boolean', default: false, name: 'active' })
  isActive: boolean;

  /** Référence vers le projet parent */
  @Column({ name: 'project_id' })
  projectId: number;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToMany(() => RegistrationSeason, insc => insc.saison)
  inscriptions?: RegistrationSeason[];

  /** Date de début de la saison */
  @Column({ type: 'date', name: 'date_debut' })
  startDate: Date;

  /** Date de fin de la saison */
  @Column({ type: 'date', name: 'date_fin' })
  endDate: Date;

  /** Date de création automatique */
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'date_creation' })
  createdAt: Date;

  /** Date de dernière mise à jour automatique */
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'date_maj' })
  updatedAt: Date;
}

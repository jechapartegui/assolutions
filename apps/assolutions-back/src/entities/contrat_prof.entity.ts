import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Season } from './saison.entity';
import { Professor } from './professeur.entity';
import {  SessionProfessor } from './seance-professeur.entity';

/**
 * Représente un contrat liant un professeur à une saison.
 * Permet de définir le type et modalités de rémunération.
 */
@Entity({ name: 'contrat_prof' })
export class ProfessorContract {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'saison_id', type: 'int' })
  saisonId: number;

  @ManyToOne(() => Season, saison => saison.contracts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saison_id' })
  saison: Season;
  /** Référence vers le professeur */
  @Column({ name: 'professeur_id' })
  professorId: number;

  @ManyToOne(() => Professor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'professeur_id' })
  professor: Professor;

    /** Professeurs assignés */
    @OneToMany(() => SessionProfessor, (sp) => sp.session)
    seanceProfesseurs: SessionProfessor[];

  /** Type de contrat (e.g. annuel, CDI, CDD) */
  @Column({ length: 50, name: 'type_contrat' })
  contractType: string;

  /** Mode de rémunération (e.g. forfaitaire, à l'heure, au cours) */
  @Column({ length: 50, name: 'type_remuneration' })
  remunerationType: string;

  /** Date de début du contrat */
  @Column({ type: 'date', name: 'date_debut' })
  startDate: Date;

  /** Date de fin du contrat, nullable pour CDI */
  @Column({ type: 'date', name: 'date_fin', nullable: true })
  endDate?: Date;

  /** Conditions annuelles ou autres détails */
  @Column({ type: 'text', name: 'details', nullable: true })
  details?: string;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'date_creation' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'date_maj' })
  updatedAt: Date;
}

import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Person } from './personne.entity';
import { ProfessorContract } from './contrat_prof.entity';

/**
 * Spécialisation de Person pour les professeurs.
 * Réutilise l'ID de Person comme clé primaire.
 */
@Entity({ name: 'professeur' })
export class Professor {
  /** Identifiant hérité de Person */
  @PrimaryColumn()
  id: number;

  /** Relation One-to-One avec Person */
  @OneToOne(() => Person, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id' })
  person: Person;

  /** Taux horaire appliqué */
  @Column({ type: 'float', nullable: true })
  hourlyRate?: number;

  /** Statut du professeur (interne, externe, etc.) */
  @Column({ length: 50, nullable: true })
  status?: string;

  /** Numéro de TVA intracommunautaire */
  @Column({ length: 20, nullable: true, name: 'num_tva' })
  vatNumber?: string;

  /** Numéro SIREN */
  @Column({ type: 'int', nullable: true, name: 'num_siren' })
  sirenNumber?: number;

  /** IBAN pour versement */
  @Column({ length: 34, nullable: true })
  iban?: string;

  /** Informations complémentaires */
  @Column({ type: 'text', nullable: true })
  info?: string;

    @CreateDateColumn({ type: 'timestamp with time zone', name: 'date_creation' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'date_maj' })
  updatedAt: Date;

  @OneToMany(() => ProfessorContract, contract => contract.professor)
contracts: ProfessorContract[];
}

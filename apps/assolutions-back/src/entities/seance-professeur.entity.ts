import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn
} from 'typeorm';
import { Session } from './seance.entity';
import { ProfessorContract } from './contrat_prof.entity';

@Entity('seance_professeur')
export class SessionProfessor {
  @PrimaryGeneratedColumn()
  id: number;  // Primary key, auto-generated:contentReference[oaicite:0]{index=0}

  @Column({ name: 'seance_id' })
  seanceId: number;  // Foreign key column (relation to Seance)

  @ManyToOne(() => Session, session => session.seanceProfesseurs, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seance_id' })
  session: Session;  // Relation to Seance entity:contentReference[oaicite:1]{index=1}

  @Column({ name: 'professeur_id' })
  professeurId: number;  // Foreign key column (relation to Professeur)

  @ManyToOne(() => ProfessorContract, prof => prof.seanceProfesseurs, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'professeur_id' })
  professeur: ProfessorContract;  // Relation to Professeur entity:contentReference[oaicite:2]{index=2}

  @Column({ type: 'varchar', length: 50 })
  statut: string;  // e.g. "prévu", "réalisé", "annulé"

  @Column({ type: 'int' })
  minutes: number;  // Duration of professor's intervention

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cout: number | null;  // Payment amount for the session (nullable)

  @Column({ type: 'text', nullable: true })
  info?: string;  // Optional free-text comments

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;  // Timestamp set on creation:contentReference[oaicite:3]{index=3}

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;  // Timestamp set on each update:contentReference[oaicite:4]{index=4}
}

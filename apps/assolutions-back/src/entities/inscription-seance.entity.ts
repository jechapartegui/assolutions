import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Person } from './personne.entity';
import { Session } from './seance.entity';

export enum InscriptionStatus {
  PRESENT = 'présent',
  ABSENT = 'absent',
  CONVOQUE = 'convoqué',
  ESSAI = 'essai',
}

export enum SeanceStatus {
  PRESENT = 'présent',
  ABSENT = 'absent',
}

@Entity({ name: 'inscription_seance' })
export class InscriptionSeance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'personne_id', type: 'int' })
  personId: number;

  @ManyToOne(() => Person, person => person.inscriptionsSeance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'personne_id' })
  person: Person;

  @Column({ name: 'seance_id', type: 'int' })
  seanceId: number;

  @ManyToOne(() => Session, seance => seance.inscriptionsPersonne, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seance_id' })
  seance: Session;

  @CreateDateColumn({ name: 'date_inscription', type: 'timestamp with time zone' })
  dateInscription: Date;

  @Column({
    name: 'statut_inscription',
    type: 'enum',
    enum: InscriptionStatus,
    nullable: true,
  })
  statutInscription?: InscriptionStatus;

  @Column({
    name: 'statut_seance',
    type: 'enum',
    enum: SeanceStatus,
    nullable: true,
  })
  statutSeance?: SeanceStatus;
}

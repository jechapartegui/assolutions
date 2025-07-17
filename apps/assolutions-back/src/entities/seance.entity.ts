import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Location } from './lieu.entity';
import { Course } from './cours.entity';
import { Season } from './saison.entity';
import {  SessionProfessor } from './seance-professeur.entity';
import {  RegistrationSession } from './inscription-seance.entity';
import { LinkGroup } from './lien_groupe.entity';

/**
 * Représente une séance (cours ou événement) dans une saison.
 */
@Entity({ name: 'seance' })
export class Session {
  @PrimaryGeneratedColumn({ name: 'seance_id' })
  id: number;

  /** Saison associée */
  @Column({ name: 'saison_id' })
  seasonId: number;
  @ManyToOne(() => Season, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saison_id' })
  season: Season;

  /** Cours parent (optionnel) */
  @Column({ name: 'cours', type: 'int', nullable: true })
  courseId?: number;
  @ManyToOne(() => Course, (c) => c.sessions, { nullable: true })
  @JoinColumn({ name: 'cours' })
  course?: Course;

  /** Libellé optionnel */
  @Column({ length: 255, nullable: true })
  label?: string;

  /** Type de séance */
  @Column({
    type: 'enum',
    enum: ['ENTRAINEMENT', 'MATCH', 'SORTIE', 'EVENEMENT'],
    default: 'ENTRAINEMENT',
    name: 'type_seance',
  })
  type: 'ENTRAINEMENT' | 'MATCH' | 'SORTIE' | 'EVENEMENT';

  /** Date et heure */
  @Column({ type: 'date', name: 'date_seance' })
  date: Date;

  @Column({ length: 10, name: 'heure_debut' })
  startTime: string;

  @Column({ type: 'int', name: 'duree_seance' })
  duration: number;

  /** Lieu */
  @Column({ name: 'lieu_id' })
  locationId: number;
  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'lieu_id' })
  location?: Location;

  /** Statut */
  @Column({
    type: 'enum',
    enum: ['prévue', 'réalisée', 'annulée'],
    name: 'statut',
    default: 'prévue',
  })
  status: 'prévue' | 'réalisée' | 'annulée';

  /** Restrictions et limites */
  @Column({ type: 'int', name: 'age_minimum', nullable: true })
  minAge?: number;

  @Column({ type: 'int', name: 'age_maximum', nullable: true })
  maxAge?: number;

  @Column({ type: 'int', name: 'place_maximum', nullable: true })
  maxPlaces?: number;

  /** Essai */
  @Column({ type: 'boolean', name: 'essai_possible', default: false })
  trialAllowed: boolean;

  @Column({ type: 'int', name: 'nb_essai_possible', nullable: true })
  trialCount?: number;

  /** Informations libres */
  @Column({ type: 'text', name: 'info_seance', nullable: true })
  info?: string;

  /** Convocation et présences */
  @Column({ type: 'boolean', name: 'convocation_nominative', default: false })
  nominativeCall: boolean;

  @Column({ type: 'boolean', name: 'afficher_present', default: false })
  showAttendance: boolean;

  /** Rendez-vous */
  @Column({ length: 255, nullable: true })
  appointment?: string;

  /** Flags de limites */
  @Column({ type: 'boolean', name: 'est_limite_age_minimum', default: false })
  limitMinAge: boolean;

  @Column({ type: 'boolean', name: 'est_limite_age_maximum', default: false })
  limitMaxAge: boolean;

  @Column({ type: 'boolean', name: 'est_place_maximum', default: false })
  limitPlaces: boolean;

  /** Professeurs assignés */
  @OneToMany(() => SessionProfessor, (sp) => sp.session)
  seanceProfesseurs: SessionProfessor[];

          @OneToMany(() => RegistrationSession, insc => insc.person)
      inscriptionsPersonne?: RegistrationSession[];

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'date_creation' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'date_maj' })
  updatedAt: Date;
   groups?: LinkGroup[];
}

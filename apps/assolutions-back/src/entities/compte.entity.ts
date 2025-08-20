import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Person } from './personne.entity';
import { Notes } from './note.entity';

@Entity({ name: 'compte' })
export class Account {
  /** Identifiant unique */
  @PrimaryGeneratedColumn()
  id: number;

  /** Identifiant de connexion (login) */
  @Column({ length: 50, unique: true })
  login: string;

  /** Mot de passe hashé */
  @Column({nullable: true})
  password: string;

  /** Jeton d'activation après inscription */
@Column({ name: 'activation_token', type: 'text', nullable: true, default: null })
activationToken: string | null;   // <-- important

  /** Date de création du compte */
  @CreateDateColumn({ name: 'date_creation', type: 'timestamp with time zone' })
  createdAt: Date;

  /** L'email a-t-il été validé ? */
  @Column({ name: 'mail_actif', default: false })
  isEmailActive: boolean;

  /** Date de la dernière connexion */
  @Column({ name: 'derniere_connexion', type: 'timestamp with time zone', nullable: true })
  lastLoginAt?: Date;

  /** Indique s'il y a eu un échec de connexion précédent */
  @Column({ name: 'echec_connexion', default: false })
  loginFailed: boolean;

  /** Le compte est-il actif ? */
  @Column({ name: 'actif', default: true })
  isActive: boolean;

  /** L'email de notification a-t-il échoué ? */
  @Column({ name: 'mail_ko', default: false })
  emailError: boolean;

  /** Date de mise à jour du compte */
  @UpdateDateColumn({ name: 'date_maj', type: 'timestamp with time zone' })
  updatedAt: Date;

    /** Liste des personnes liées à ce compte */
  @OneToMany(() => Person, person => person.account, { cascade: ['update'] })
  persons: Person[];

    @OneToMany(() => Notes, note => note.User, { cascade: ['update'] })
  notes: Notes[];
}

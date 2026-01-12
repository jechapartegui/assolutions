import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Season } from "./saison.entity";
import { Account } from "./compte.entity";
import { Adresse } from "@shared/lib/adresse.interface";
import { ItemContact } from "@shared/lib/personne.interface";

/**
 * Représente un login de projet (projet_login) avec ses informations de connexion et de contact.
 */
@Entity({ name: "project" })
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, name: "nom" })
  name: string;

  @Column({ type: "boolean", default: false, name: "actif" })
  isActive: boolean;

  @Column({ type: "date", name: "date_debut" })
  startDate: Date;

  @Column({ type: "date", name: "date_fin" })
  endDate: Date;

  /** Liste des contacts JSONB */
  @Column({ type: "jsonb", nullable: true, name: "contact" })
  contacts?: ItemContact[];

  /** Adresse structurée JSONB */
  @Column({ type: "jsonb", nullable: true, name: "adresse" })
  address?: Adresse;

  /** Activité principale du projet */
  @Column({ length: 100, nullable: true, name: "activite" })
  activity?: string;

  /** Langue par défaut */
  @Column({ length: 10, nullable: true, name: "lang" })
  language?: string;

  /** Logo (URL ou base64) */
  @Column({ type: "text", nullable: true, name: "logo" })
  logo?: string;

  /** Couleur associée (hex) */
  @Column({ length: 7, nullable: true, name: "couleur" })
  color?: string;

  /** Identifiants de connexion */
  @Column({ length: 50, unique: true, name: "login" })
  login: string;

  @Column({ name: "password" })
  password: string;

  @Column({ name: "compte", type: 'int', nullable: false })
  compte: number;

    @ManyToOne(() => Account, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'compte' })
    account: Account;
  
  /** Jeton d'activation après inscription */
@Column({ name: 'activation_token', type: 'text', nullable: true, default: null })
activationToken: string | null;   // <-- important

  @CreateDateColumn({ type: "timestamp with time zone", name: "date_creation" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp with time zone", name: "date_maj" })
  updatedAt: Date;

  @OneToMany(() => Season, s => s.project)
seasons?: Season[];
}

import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Lieu } from "./lieu";
import { Cours } from "./cours";
import { SeanceProfesseur } from "./seance_professeur";

@Entity('seance')
export class Seance {
  @PrimaryGeneratedColumn({ name: 'seance_id' })
  seance_id: number;

  @Column()
  saison_id: number;

  @Column({ default: 0 })
  cours: number;

  @Column({ length: 255, nullable: true })
  libelle: string;

  @Column({
    type: 'enum',
    enum: ['ENTRAINEMENT', 'MATCH', 'SORTIE', 'EVENEMENT'],
    default: 'ENTRAINEMENT'
  })
  type_seance: 'ENTRAINEMENT' | 'MATCH' | 'SORTIE' | 'EVENEMENT';

  @Column({ type: 'date' })
  date_seance: Date;

  @Column({ length: 10 })
  heure_debut: string;

  @Column()
  duree_seance: number;

  @Column()
  lieu_id: number;

  @Column({
    type: 'enum',
    enum: ['prévue', 'réalisée', 'annulée']
  })
  statut: 'prévue' | 'réalisée' | 'annulée';

@Column({ type: 'int', nullable: true })
  age_minimum: number | null;;

@Column({ type: 'int', nullable: true })
  age_maximum: number | null;;

@Column({ type: 'int', nullable: true })
  place_maximum: number | null;;

  @Column({ type: 'tinyint', default: 0 })
  essai_possible: boolean;

@Column({ type: 'int', nullable: true })
  nb_essai_possible: number | null;;

  @Column({ type: 'longtext' })
  info_seance: string;

  @Column({ type: 'tinyint', default: 0 })
  convocation_nominative: boolean;

  @Column({ type: 'tinyint', default: 0 })
  afficher_present: boolean;

  @Column({ length: 255, nullable: true })
  rdv: string;

  @Column({ type: 'tinyint', default: 0 })
  est_limite_age_minimum: boolean;

  @Column({ type: 'tinyint', default: 0 })
  est_limite_age_maximum: boolean;

  @Column({ type: 'tinyint', default: 0 })
  est_place_maximum: boolean;

  @ManyToOne(() => Lieu, { nullable: true })
@JoinColumn({ name: 'lieu_id' })
lieu?: Lieu;

@ManyToOne(() => Cours, { nullable: true })
@JoinColumn({ name: 'cours' })
coursEntity?: Cours;

@OneToMany(() => SeanceProfesseur, cp => cp.seance_id)
professeursSeance: SeanceProfesseur[];
}

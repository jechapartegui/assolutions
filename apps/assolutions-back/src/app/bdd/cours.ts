import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { CoursProfesseur } from "./cours_professeur";
import { LienGroupe } from "./lien-groupe";
import { Lieu } from "./lieu";

@Entity('cours')
export class Cours {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  project_id: number;

  @Column({ length: 255 })
  nom: string;

  @Column({ length: 20 })
  jour_semaine: string;

  @Column({ length: 10 })
  heure: string;

  @Column()
  duree: number;

  @Column()
  prof_principal_id: number;

  @Column()
  lieu_id: number;

  @Column({ nullable: true })
  age_minimum: number;

  @Column({ nullable: true })
  age_maximum: number;

  @Column()
  saison_id: number;

  @Column({ nullable: true })
  place_maximum: number;

  @Column({ type: 'tinyint', default: 0 })
  convocation_nominative: boolean;

  @Column({ type: 'tinyint', default: 0 })
  afficher_present: boolean;

  @Column({ type: 'tinyint', default: 0 })
  est_limite_age_minimum: boolean;

  @Column({ type: 'tinyint', default: 0 })
  est_limite_age_maximum: boolean;

  @Column({ type: 'tinyint', default: 0 })
  est_place_maximum: boolean;

  @OneToMany(() => CoursProfesseur, cp => cp.cours)
professeursCours: CoursProfesseur[];

 @ManyToOne(() => Lieu, { nullable: true })
@JoinColumn({ name: 'lieu_id' })
lieu?: Lieu;

// Pas de décorateur TypeORM
lienGroupes?: LienGroupe[];
}

import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";
import { Cours } from "./cours";
import { Adherent } from "./riders";

@Entity('cours_professeur')
export class CoursProfesseur {
  @PrimaryColumn()
  cours_id: number;

  @PrimaryColumn()
  prof_id: number;

  @ManyToOne(() => Cours, cours => cours.professeursCours)
  @JoinColumn({ name: 'cours_id' })
  cours: Cours;

  @ManyToOne(() => Adherent) // 👈 c'est la table "riders"
  @JoinColumn({ name: 'prof_id' })
  professeur: Adherent;
}

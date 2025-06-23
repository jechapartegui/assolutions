import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Seance } from "./seance";
import { Adherent } from "./riders";
import { Professeur } from "./professeur";

@Entity('seance_professeur')
export class SeanceProfesseur {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  seance_id: number;

  @Column()
  professeur_id: number;

  @Column()
  minutes: number;

  @Column({ type: 'float', nullable: true })
  taux_horaire: number;

  @Column()
  minutes_payees: number;

  @Column()
  statut: number;

  @Column({ type: 'text', nullable: true })
  info: string;

  @ManyToOne(() => Seance, seance => seance.professeursSeance)
@JoinColumn({ name: 'seance_id' })
seance: Seance;

@ManyToOne(() => Adherent)
@JoinColumn({ name: 'professeur_id' })
personne: Adherent;

@ManyToOne(() => Professeur)
@JoinColumn({ name: 'professeur_id' })
info_prof: Professeur;
}

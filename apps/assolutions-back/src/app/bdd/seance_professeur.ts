import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

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
}

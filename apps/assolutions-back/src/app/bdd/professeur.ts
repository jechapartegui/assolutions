import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity('professeur')
export class Professeur {
  @PrimaryColumn()
  id: number;

  @Column({ type: 'float', nullable: true })
  taux: number;

  @Column({ nullable: true })
  statut: string;

  @Column({ nullable: true })
  num_tva: string;

  @Column({ type: 'int', nullable: true })
  num_siren: number;

  @Column({ nullable: true })
  iban: string;

  @Column('text', { nullable: true })
  info: string;
}

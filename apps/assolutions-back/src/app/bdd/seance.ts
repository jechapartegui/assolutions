import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

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

  @Column({ nullable: true })
  age_minimum: number;

  @Column({ nullable: true })
  age_maximum: number;

  @Column({ nullable: true })
  place_maximum: number;

  @Column({ type: 'tinyint', default: 0 })
  essai_possible: boolean;

  @Column({ type: 'longtext' })
  notes: string;

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
}

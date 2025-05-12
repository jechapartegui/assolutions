import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('riders')
export class Adherent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  project_id: number;

  @Column()
  nom: string;

  @Column()
  prenom: string;

  @Column({ nullable: true })
  surnom: string;

  @Column({ type: 'date' })
  date_naissance: Date;

  @Column({ type: 'tinyint', default: 0 })
  sexe: boolean; // 0 = femme, 1 = homme  

  @Column()
  adresse: string;

  @Column()
  compte: number;

  @Column({ type: 'tinyint', default: 0 })
  est_prof: boolean;

  @Column('text')
  contacts: string;

  @Column('text')
  contacts_prevenir: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date_creation: Date;
}

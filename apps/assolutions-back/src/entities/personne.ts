import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('personne')
export class Personne {
  @PrimaryGeneratedColumn()
  id: number;

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

  @Column('text')
  contacts: string;

  @Column('text')
  contacts_prevenir: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date_creation: Date;

  @Column({ type: 'timestamp' })
  date_maj: Date;
}

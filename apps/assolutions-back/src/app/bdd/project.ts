import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('projet_login')
export class Projet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nom: string;

  @Column({ type: 'tinyint', default: 0 })
  actif: boolean;

  @Column({ type: 'date' })
  date_debut: Date;

  @Column()
  password: string;
}
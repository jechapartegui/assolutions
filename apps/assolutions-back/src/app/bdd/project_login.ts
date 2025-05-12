import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('projet_login')
export class ProjetLogin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  nom: string;

  @Column({ type: 'tinyint', default: 1 })
  actif: boolean;

  @Column({ type: 'date' })
  date_debut: Date;

  @Column({ length: 255 })
  password: string;

  @Column({ length: 100 })
  login: string;
}

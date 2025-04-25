import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('saison')
export class Saison {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 10 })
  nom: string;

  @Column({ type: 'tinyint' })
  active: boolean;

  @Column()
  project_id: number;

  @Column({ type: 'date' })
  date_debut: Date;

  @Column({ type: 'date' })
  date_fin: Date;
}

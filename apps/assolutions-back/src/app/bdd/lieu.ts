import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('lieu')
export class Lieu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  project_id: number;

  @Column({ length: 255 })
  nom: string;

  @Column('text')
  adresse: string;

  @Column({ type: 'tinyint', default: 0 })
  shared: boolean;
}

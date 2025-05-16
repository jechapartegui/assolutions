import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('groupes')
export class Groupe {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nom: string;

  @Column()
  saison_id: number;
}

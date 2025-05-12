import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('lien_groupe')
export class LienGroupe {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  groupe_id: number;

  @Column()
  objet_id: number;

  @Column({ length: 20 })
  objet_type: string;
}

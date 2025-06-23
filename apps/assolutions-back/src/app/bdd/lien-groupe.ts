import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Groupe } from "./groupe";

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

@ManyToOne(() => Groupe, { nullable: true })
@JoinColumn({ name: 'groupe_id' })
groupeEntity?: Groupe;
}

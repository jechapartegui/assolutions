import { Adresse } from "@shared/src/lib/adresse.interface";
import { ItemContact } from "@shared/src/lib/personne.interface";
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


  @Column({ type: 'date' })
  date_fin: Date;

  contact:ItemContact[]
  adresse:Adresse;
  activite :string;
  lang:string;
  logo:any//'image' ?
  couleur:string;
  login:string;
  password:string;

}
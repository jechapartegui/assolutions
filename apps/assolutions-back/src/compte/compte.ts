import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('compte') // nom exact de ta table
export class Compte {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  login: string;

  @Column()
  password: string;

  @Column()
  activation_token: string;
  
  @Column()
  date_creation: Date;

  @Column()
  mail_actif: boolean;
  
  @Column()
  derniere_connexion: Date;

  @Column()
  echec_connexion: boolean;

  @Column()
  actif: boolean;
  
  @Column()
  mail_ko: boolean;

}

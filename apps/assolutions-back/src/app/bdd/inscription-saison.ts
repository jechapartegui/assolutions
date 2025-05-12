import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('inscription_saison')
export class InscriptionSaison {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  rider_id: number;

  @Column()
  saison_id: number;

  @Column({ length: 255 })
  token: string;

  @Column({ type: 'date' })
  date_token: Date;
}

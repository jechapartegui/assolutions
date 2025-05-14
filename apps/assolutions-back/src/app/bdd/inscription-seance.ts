import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('inscription')
export class InscriptionSeance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  rider_id: number;

  @Column()
  seance_id: number;

  @Column({ type: 'date' })
  date_inscription: Date;

  @Column({
    type: 'enum',
    enum: ['présent', 'absent', 'convoqué', 'essai'],
    nullable: true
  })
  statut_inscription: 'présent' | 'absent' | 'convoqué' | 'essai' | undefined;

  @Column({
    type: 'enum',
    enum: ['présent', 'absent'],
    nullable: true
  })
  statut_seance: 'présent' | 'absent'| undefined;
}

import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { GroupesEntity } from '../groupes/groupes.entity';
import { TarifInscriptionEntity } from './tarif_inscription.entity';

@Entity({ name: 'groupe_tarif_inscription' })
@Index(
  'uq_groupe_tarif_inscription',
  ['groupe_id', 'tarif_inscription_id'],
  { unique: true },
)
export class GroupeTarifInscriptionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  groupe_id: number;

  @Column({ type: 'int' })
  tarif_inscription_id: number;

  @ManyToOne(
    () => GroupesEntity,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'groupe_id' })
  groupe?: GroupesEntity;

  @ManyToOne(
    () => TarifInscriptionEntity,
    (tarif) => tarif.groupe_liens,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'tarif_inscription_id' })
  tarif?: TarifInscriptionEntity;
}

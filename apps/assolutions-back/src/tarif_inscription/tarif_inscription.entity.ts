import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { GroupeTarifInscriptionEntity } from './groupe_tarif_inscription.entity';

@Entity({ name: 'tarif_inscription' })
export class TarifInscriptionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  saison_id: number;

  @Column({ type: 'varchar', length: 150 })
  nom: string;

  @Column({ type: 'int', default: 0 })
  prix_centimes: number;

  @Column({ type: 'int', nullable: true })
  compte_bancaire_id: number | null;

  @Column({ type: 'date', nullable: true })
  date_debut_validite: string | null;

  @Column({ type: 'date', nullable: true })
  date_fin_validite: string | null;

  @Column({ type: 'boolean', default: false })
  reinscription: boolean;

  @Column({ type: 'int', default: 1 })
  paiement_plusieurs_fois: number;

  @Column({ type: 'int', nullable: true })
  age_min: number | null;

  @Column({ type: 'int', nullable: true })
  age_max: number | null;

  @Column({ type: 'int', nullable: true })
  naissance_avant: number | null;

  @Column({ type: 'int', nullable: true })
  naissance_apres: number | null;

  @Column({ type: 'int', nullable: true })
  limit_nb: number | null;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @Column({ type: 'int', default: 0 })
  ordre: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at: Date;

  @OneToMany(
    () => GroupeTarifInscriptionEntity,
    (liaison) => liaison.tarif,
  )
  groupe_liens?: GroupeTarifInscriptionEntity[];
}
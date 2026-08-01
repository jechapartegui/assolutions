import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'code_promo' })
export class CodePromoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  project_id: number;

  @Column({ type: 'int' })
  saison_id: number;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 150 })
  libelle: string;

  @Column({ type: 'varchar', length: 20 })
  type_remise: 'POURCENTAGE' | 'MONTANT';

  @Column({ type: 'int' })
  valeur: number;

  @Column({ type: 'int', nullable: true })
  montant_min_centimes: number | null;

  @Column({ type: 'int', nullable: true })
  max_remise_centimes: number | null;

  @Column({ type: 'date', nullable: true })
  date_debut: string | null;

  @Column({ type: 'date', nullable: true })
  date_fin: string | null;

  @Column({ type: 'int', nullable: true })
  limit_nb: number | null;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @Column({ type: 'timestamp', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date | null;
}

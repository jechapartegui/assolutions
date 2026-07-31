import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'souscription_personne' })
export class SouscriptionPersonneEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  souscription_id: number;

  @Column({ type: 'int' })
  personne_id: number;

  @Column({ type: 'int', nullable: true })
  tarif_inscription_id: number | null;

  @Column({ type: 'int', default: 0 })
  prix_initial_centimes: number;

  @Column({ type: 'int', default: 0 })
  remise_centimes: number;

  @Column({ type: 'int', default: 0 })
  prix_final_centimes: number;

  @Column({ type: 'varchar', length: 40, default: 'BROUILLON' })
  statut: string;

  @Column({ type: 'int', nullable: true })
  inscription_saison_id: number | null;

  @Column({ type: 'timestamp', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date | null;
}

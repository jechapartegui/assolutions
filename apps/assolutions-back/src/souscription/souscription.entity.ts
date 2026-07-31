import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'souscription' })
export class SouscriptionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  project_id: number;

  @Column({ type: 'int' })
  saison_id: number;

  @Column({ type: 'int' })
  compte_id: number;

  @Column({ type: 'int', nullable: true })
  payeur_personne_id: number | null;

  @Column({ type: 'varchar', length: 40, default: 'BROUILLON' })
  statut: string;

  @Column({ type: 'int', default: 0 })
  montant_initial_centimes: number;

  @Column({ type: 'int', default: 0 })
  montant_remise_centimes: number;

  @Column({ type: 'int', default: 0 })
  montant_total_centimes: number;

  @Column({ type: 'int', default: 1 })
  nb_echeances: number;

  @Column({ type: 'int', nullable: true })
  code_promo_id: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  code_promo_applique: string | null;

  @Column({ type: 'int', nullable: true })
  helloasso_checkout_intent_id: number | null;

  @Column({ type: 'int', nullable: true })
  helloasso_order_id: number | null;

  @Column({ type: 'text', nullable: true })
  helloasso_redirect_url: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  helloasso_payment_state: string | null;

  @Column({ type: 'timestamp', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  paid_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  finalized_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  canceled_at: Date | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;
}

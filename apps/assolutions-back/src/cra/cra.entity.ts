import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'cra' })
export class CraEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  project_id: number;

  @Column({ type: 'int' })
  saison_id: number;

  @Column({ type: 'int' })
  contrat_prof_id: number;

  @Column({ type: 'int' })
  annee: number;

  @Column({ type: 'int' })
  mois: number;

  @Column({ type: 'varchar', length: 30, default: 'BROUILLON' })
  statut: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  montant_total: string;

  @Column({ type: 'text', nullable: true })
  commentaire_club: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  date_validation: Date | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at: Date;
}

@Entity({ name: 'cra_ligne' })
export class CraLigneEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  cra_id: number;

  @Column({ type: 'int', nullable: true })
  seance_professeur_id: number | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 30 })
  type: string;

  @Column({ type: 'varchar', length: 255 })
  libelle: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 1 })
  quantite: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  taux: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  montant: string;
}

@Entity({ name: 'facture_prof' })
export class FactureProfEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  cra_id: number;

  @Column({ type: 'int', nullable: true })
  flux_financier_id: number | null;

  @Column({ type: 'int', nullable: true })
  document_id: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  numero: string | null;

  @Column({ type: 'date' })
  date_facture: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  montant_ttc: string;

  @Column({ type: 'varchar', length: 30, default: 'DEPOSEE' })
  statut: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at: Date;
}

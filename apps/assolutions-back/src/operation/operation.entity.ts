import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'operation' })
export class OperationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'double precision' })
  solde: number;

  @Column({ type: 'date' })
  date_operation: string;

  @Column({ type: 'date', nullable: true })
  date_previsionnelle: string | null;

  @Column({ type: 'int' })
  mode: number;

  @Column({ type: 'text' })
  destinataire: string;

  @Column({ type: 'boolean' })
  paiement_execute: boolean;

  @Column({ type: 'int' })
  compte_bancaire_id: number;

  @Column({ type: 'int', nullable: true })
  flux_financier_id: number | null;

  @Column({ type: 'text', nullable: true })
  libelle_bancaire: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  import_key: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  source_import: string | null;

  @Column({ type: 'text', nullable: true })
  info: string | null;
}
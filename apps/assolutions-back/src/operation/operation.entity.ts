import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'operation' })
export class OperationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'double precision' })
  solde: number;

  @Column({ type: 'date' })
  date_operation: string;

  @Column({ type: 'int' })
  mode: number;

  @Column({ type: 'text' })
  destinataire: string;

  @Column({ type: 'boolean' })
  paiement_execute: boolean;

  @Column({ type: 'int' })
  compte_bancaire_id: number;

  @Column({ type: 'int' })
  flux_financier_id: number;

  @Column({ type: 'text', nullable: true })
  info: string | null;
}

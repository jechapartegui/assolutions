import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BankAccount } from './compte_bancaire.entity';
import { FinancialFlow } from './flux_financier.entity';


@Entity({ name: 'operation' })
export class Operation {
@PrimaryGeneratedColumn()
id: number;


@Column({ name: 'solde', type: 'float' })
balance: number; // signed


@Column({ name: 'date_operation', type: 'date' })
operationDate: string; // YYYY-MM-DD


@Column({ name: 'mode', type: 'int'})
mode: number; // e.g., "Prélèvement", codes, etc.
 

@Column({ name: 'destinataire', type: 'text' })
recipient: string; // JSON link


@Column({ name: 'paiement_execute', type: 'boolean' })
executed: boolean;


@Column({ name: 'compte_bancaire_id', type: 'int' })
bankAccountId: number;
  @ManyToOne(() => BankAccount)
  @JoinColumn({ name: 'compte_bancaire_id' })
  bankaccount: BankAccount;

@Column({ name: 'flux_financier_id', type: 'int' })
financialFlowId: number;
  @ManyToOne(() => FinancialFlow)
  @JoinColumn({ name: 'flux_financier_id' })
  financialFlow: FinancialFlow;

@Column({ name: 'info', type: 'text', nullable: true })
info?: string | null;
}
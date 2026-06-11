import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'budget_ligne' })
export class BudgetLigneEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  budget_scenario_id!: number;

  @Column({ type: 'int' })
  classe_comptable_id!: number;

  @Column({ type: 'double precision' })
  montant_budget!: number;

  @Column({ type: 'text', nullable: true })
  info!: string | null;
}
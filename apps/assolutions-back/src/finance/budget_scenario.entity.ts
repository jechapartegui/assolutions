import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
@Entity({ name: 'budget_scenario' })
export class BudgetScenarioEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  project_id: number;

  @Column({ type: 'int' })
  saison_id: number;

  @Column({ type: 'varchar', length: 255 })
  nom: string;

  @Column({ type: 'boolean', default: false })
  scenario_defaut: boolean;

  @Column({ type: 'text', nullable: true })
  info: string | null;
}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccessControlModule } from '../common/access-control.module';


import { FluxFinancierEntity } from '../flux_financier/flux_financier.entity';
import { OperationEntity } from '../operation/operation.entity';
import { CompteBancaireEntity } from '../compte_bancaire/compte_bancaire.entity';

import { BudgetScenarioEntity } from './budget_scenario.entity';
import { BudgetLigneEntity } from './budget_ligne.entity';
import { ClasseComptableEntity } from './classe_comptable.entity';

import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FluxFinancierEntity,
      OperationEntity,
      CompteBancaireEntity,
      BudgetScenarioEntity,
      BudgetLigneEntity,
      ClasseComptableEntity,
    ]),
    AccessControlModule,
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
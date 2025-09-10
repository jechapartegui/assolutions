import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddInfo } from '../../entities/addinfo.entity';
import { BankAccount } from '../../entities/compte_bancaire.entity';
import { FinancialFlow } from '../../entities/flux_financier.entity';
import { Operation } from '../../entities/operation.entity';
import { StockItem } from '../../entities/stock.entity';
import { AddInfoService } from '../../crud/addinfo.service';
import { BankAccountService } from '../../crud/bankaccount.service';
import { FinancialFlowService } from '../../crud/financialflow.service';
import { OperationService } from '../../crud/operation.service';
import { StockService } from '../../crud/stock.service';
import { AdminService } from './admin.services';
import { AdminController } from './admin.controller';


@Module({
imports: [TypeOrmModule.forFeature([AddInfo, BankAccount, FinancialFlow, Operation, StockItem])],
providers: [AddInfoService, BankAccountService, FinancialFlowService, OperationService, StockService, AdminService],
controllers: [AdminController],
exports: [AdminService],
})
export class AdminModule {}
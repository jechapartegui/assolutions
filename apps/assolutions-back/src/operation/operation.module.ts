import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OperationController } from './operation.controller';
import { OperationEntity } from './operation.entity';
import { OperationService } from './operation.service';
import { FluxFinancierEntity } from '../flux_financier/flux_financier.entity';
import { FluxFinancierService } from '../flux_financier/flux_financier.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
import { CompteBancaireEntity } from '../compte_bancaire/compte_bancaire.entity';
@Module({
  imports: [TypeOrmModule.forFeature([OperationEntity, FluxFinancierEntity, CompteBancaireEntity]), AccessControlModule],
  controllers: [OperationController],
  providers: [OperationService, FluxFinancierService],
})
export class OperationModule {}

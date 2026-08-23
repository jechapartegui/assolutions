import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccessControlModule } from '../common/access-control.module';
import { CompteBancaireEntity } from '../compte_bancaire/compte_bancaire.entity';
import { FluxFinancierEntity } from '../flux_financier/flux_financier.entity';
import { OperationController } from './operation.controller';
import { OperationEntity } from './operation.entity';
import { OperationService } from './operation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OperationEntity,
      FluxFinancierEntity,
      CompteBancaireEntity,
    ]),
    AccessControlModule,
  ],
  controllers: [OperationController],
  providers: [OperationService],
})
export class OperationModule {}

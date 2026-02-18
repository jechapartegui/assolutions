import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { FluxFinancierController } from './flux_financier.controller';
import { FluxFinancierEntity } from './flux_financier.entity';
import { FluxFinancierService } from './flux_financier.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
@Module({
  imports: [TypeOrmModule.forFeature([FluxFinancierEntity]), RegistryModule, AccessControlModule],
  controllers: [FluxFinancierController],
  providers: [FluxFinancierService],
})
export class FluxFinancierModule {}

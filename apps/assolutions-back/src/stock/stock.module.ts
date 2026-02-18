import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { StockController } from './stock.controller';
import { StockEntity } from './stock.entity';
import { StockService } from './stock.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
@Module({
  imports: [TypeOrmModule.forFeature([StockEntity]), RegistryModule, AccessControlModule],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}

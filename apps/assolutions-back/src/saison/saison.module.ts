import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { SaisonController } from './saison.controller';
import { SaisonEntity } from './saison.entity';
import { SaisonService } from './saison.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
@Module({
  imports: [TypeOrmModule.forFeature([SaisonEntity]), RegistryModule, AccessControlModule],
  controllers: [SaisonController],
  providers: [SaisonService],
})
export class SaisonModule {}

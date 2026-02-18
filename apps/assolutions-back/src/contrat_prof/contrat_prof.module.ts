import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { ContratProfController } from './contrat_prof.controller';
import { ContratProfEntity } from './contrat_prof.entity';
import { ContratProfService } from './contrat_prof.service';
import { SaisonService } from '../saison/saison.service';
import { SaisonEntity } from '../saison/saison.entity';

import { AccessControlModule } from '../common/access-control.module'; // ✅

@Module({
  imports: [TypeOrmModule.forFeature([ContratProfEntity, SaisonEntity]), RegistryModule, AccessControlModule],
  controllers: [ContratProfController],
  providers: [ContratProfService, SaisonService],
})
export class ContratProfModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { CoursController } from './cours.controller';
import { CoursEntity } from './cours.entity';
import { CoursService } from './cours.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
import { ContratProfEntity } from '../contrat_prof/contrat_prof.entity';
@Module({
  imports: [TypeOrmModule.forFeature([CoursEntity, ContratProfEntity]), RegistryModule, AccessControlModule],
  controllers: [CoursController],
  providers: [CoursService],
})
export class CoursModule {}

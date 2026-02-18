import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { ProfesseurController } from './professeur.controller';
import { ProfesseurEntity } from './professeur.entity';
import { ProfesseurService } from './professeur.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
@Module({
  imports: [TypeOrmModule.forFeature([ProfesseurEntity]), RegistryModule, AccessControlModule],
  controllers: [ProfesseurController],
  providers: [ProfesseurService],
})
export class ProfesseurModule {}

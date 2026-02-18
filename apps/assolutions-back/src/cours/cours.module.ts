import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { CoursController } from './cours.controller';
import { CoursEntity } from './cours.entity';
import { CoursService } from './cours.service';

import { AccessControlModule } from '../common/access-control.module'; // ✅
@Module({
  imports: [TypeOrmModule.forFeature([CoursEntity]), RegistryModule, AccessControlModule],
  controllers: [CoursController],
  providers: [CoursService],
})
export class CoursModule {}

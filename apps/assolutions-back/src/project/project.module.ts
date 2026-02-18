import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { ProjectController } from './project.controller';
import { ProjectEntity } from './project.entity';
import { ProjectService } from './project.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity]), RegistryModule],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService], // <- indispensable
})
export class ProjectModule {}


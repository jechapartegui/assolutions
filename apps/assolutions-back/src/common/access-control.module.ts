import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from '../project/project.entity';
import { AccessControlService } from './access-control.service';
import { ProjectAdminGuard } from './guards/project-admin.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity])],
  providers: [AccessControlService, ProjectAdminGuard],
  exports: [AccessControlService, ProjectAdminGuard],
})
export class AccessControlModule {}

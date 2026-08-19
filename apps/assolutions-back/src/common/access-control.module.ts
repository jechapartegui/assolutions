import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { ProjectAccessGuard } from './guards/project-access.guard';
import { ProjectAdminGuard } from './guards/project-admin.guard';

@Global()
@Module({
  providers: [AccessControlService, ProjectAccessGuard, ProjectAdminGuard],
  exports: [AccessControlService, ProjectAccessGuard, ProjectAdminGuard],
})
export class AccessControlModule {}

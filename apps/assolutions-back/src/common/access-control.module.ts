import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { ProjectAccessGuard } from './guards/project-access.guard';
import { ProjectAdminGuard } from './guards/project-admin.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';

@Global()
@Module({
  providers: [
    AccessControlService,
    ProjectAccessGuard,
    ProjectAdminGuard,
    SuperAdminGuard,
  ],
  exports: [
    AccessControlService,
    ProjectAccessGuard,
    ProjectAdminGuard,
    SuperAdminGuard,
  ],
})
export class AccessControlModule {}

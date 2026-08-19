import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { ProjectAdminGuard } from './guards/project-admin.guard';

@Global()
@Module({
  providers: [AccessControlService, ProjectAdminGuard],
  exports: [AccessControlService, ProjectAdminGuard],
})
export class AccessControlModule {}

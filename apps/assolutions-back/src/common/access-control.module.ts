import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from '../project/project.entity';
import { ProjectAdminGuard } from './guards/project-admin.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity])],
  providers: [ProjectAdminGuard],
  exports: [ProjectAdminGuard],
})
export class AccessControlModule {}

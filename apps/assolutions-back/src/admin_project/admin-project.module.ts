import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AdminProjectController } from './admin-project.controller';
import { AdminProjectService } from './admin-project.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminProjectController],
  providers: [AdminProjectService],
})
export class AdminProjectModule {}

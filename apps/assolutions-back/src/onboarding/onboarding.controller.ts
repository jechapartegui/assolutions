import { Controller, Get, Post, UseGuards } from '@nestjs/common';

import { ProjectId } from '../common/decorators/project-id.decorator';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @UseGuards(ProjectAdminGuard)
  @Get('status')
  status(@ProjectId() projectId: number) {
    return this.service.getStatus(projectId);
  }

  @UseGuards(ProjectAdminGuard)
  @Post('default-bank')
  createDefaultBank(@ProjectId() projectId: number) {
    return this.service.createDefaultBank(projectId);
  }
}

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { ProjectId } from '../common/decorators/project-id.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { BootstrapClubDto } from './onboarding.dto';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Public()
  @Post('bootstrap')
  bootstrap(@Body() dto: BootstrapClubDto) {
    return this.service.bootstrap(dto);
  }

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

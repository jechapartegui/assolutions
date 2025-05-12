import { BadRequestException,  Controller, Get, Headers } from '@nestjs/common';
import { ProjectService } from './project.service';
// src/auth/auth.controller.ts
@Controller('project')
export class ProjectController {
  constructor(private readonly proService: ProjectService) {}

  @Get('active_saison')
  async getActiveSaison(@Headers('projectid') projectId: number) {
    const projectIdNumber = +projectId;

    if (isNaN(projectIdNumber)) {
      throw new BadRequestException('INVALID HEADER');
    }

    return this.proService.getActiveSaion(projectIdNumber);
  }
}
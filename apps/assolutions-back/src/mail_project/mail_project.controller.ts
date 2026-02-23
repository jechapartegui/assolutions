import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateMailProjectDto, UpdateMailProjectDto } from './mail_project.dto';
import { MailProjectService } from './mail_project.service';

@Controller('mail-project')
export class MailProjectController {
  constructor(private readonly service: MailProjectService) {}

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get()
  get(@ProjectId() projectId: number) {
    return this.service.get(projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  createOrReplace(@ProjectId() projectId: number, @Body() dto: CreateMailProjectDto) {
    return this.service.upsert(projectId, dto);
  }

  // ✅ UPDATE via POST (remplace Patch)
  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post('update')
  update(@ProjectId() projectId: number, @Body() dto: UpdateMailProjectDto) {
    return this.service.upsert(projectId, dto);
  }

  // ✅ DELETE via POST (remplace Delete)
  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post('delete')
  remove(@ProjectId() projectId: number) {
    return this.service.remove(projectId);
  }
}

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import {
  GetMailProjectTemplateParamsDto,
  InitMailProjectDto,
  MailProjectTemplateType,
  UpdateMailProjectBodylessTemplateDto,
  UpdateMailProjectTemplateDto,
} from './mail_project.dto';
import { MailProjectService } from './mail_project.service';

@Controller('mail-project')
@UseGuards(JwtAuthGuard)
export class MailProjectController {
  constructor(private readonly service: MailProjectService) {}

  @Post('init')
  init(@ProjectId() projectId: number, @Body() dto: InitMailProjectDto) {
    return this.service.init(projectId, dto);
  }

  @Get()
  get(@ProjectId() projectId: number) {
    return this.service.get(projectId);
  }

  @Get(':type')
  getTemplate(
    @ProjectId() projectId: number,
    @Param() params: GetMailProjectTemplateParamsDto,
  ) {
    return this.service.getTemplate(projectId, params.type);
  }

  @Post(':type')
  updateTemplate(
    @ProjectId() projectId: number,
    @Param() params: GetMailProjectTemplateParamsDto,
    @Body() dto: UpdateMailProjectTemplateDto | UpdateMailProjectBodylessTemplateDto,
  ) {
    return this.service.updateTemplate(
      projectId,
      params.type as MailProjectTemplateType,
      dto,
    );
  }
}
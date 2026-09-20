import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { MessageService } from '../message/message.service';
import {
  GetMailProjectTemplateParamsDto,
  InitMailProjectDto,
  MailProjectTemplateType,
  SendMailProjectTestDto,
  UpdateMailProjectBodylessTemplateDto,
  UpdateMailProjectTemplateDto,
} from './mail_project.dto';
import { MailProjectService } from './mail_project.service';

@Controller('mail-project')
@UseGuards(JwtAuthGuard)
export class MailProjectController {
  constructor(
    private readonly service: MailProjectService,
    private readonly messageService: MessageService,
  ) {}

  @Post('init')
  init(@ProjectId() projectId: number, @Body() dto: InitMailProjectDto) {
    return this.service.init(projectId, dto);
  }

  @UseGuards(ProjectAdminGuard)
  @Post('test')
  async sendTest(
    @ProjectId() projectId: number,
    @Body() dto: SendMailProjectTestDto,
  ) {
    await this.messageService.sendAutomaticMail({
      to: dto.email,
      subject: dto.subject,
      html: dto.html,
      projectId,
      record: `TEMPLATE_TEST:${dto.type}`,
    });

    return { ok: true };
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

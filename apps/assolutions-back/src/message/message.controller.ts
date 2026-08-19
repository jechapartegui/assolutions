import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { SendMessagesDto } from './message.dto';
import { MessageService } from './message.service';

@Controller('messages')
@UseGuards(JwtAuthGuard, ProjectAdminGuard)
export class MessageController {
  constructor(private readonly service: MessageService) {}

  @Post('send')
  send(@ProjectId() projectId: number, @Body() dto: SendMessagesDto) {
    return this.service.send(projectId, dto);
  }

  @Get('health')
  async health() {
    await this.service.verifyConnection();
    return { ok: true, service: 'smtp' };
  }
}

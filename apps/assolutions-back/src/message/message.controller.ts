import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { SendMessagesDto } from './message.dto';
import { MessageService } from './message.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly service: MessageService) {}

  @Post('send')
  send(
    @ProjectId() projectId: number,
    @Body() dto: SendMessagesDto,
  ) {
    return this.service.send(projectId, dto);
  }
}
import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { CreateMailAccountDto, UpdateMailAccountDto } from './mail_account.dto';
import { MailAccountService } from './mail_account.service';

@Controller('mail-account')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class MailAccountController {
  constructor(private readonly service: MailAccountService) {}

  // mail_account n'a pas de project_id : impossible de garantir une isolation
  // multi-tenant correcte. L'administration HTTP reste donc fermée tant que le
  // modèle n'est pas rattaché à un projet. L'envoi interne de mails n'est pas affecté.
  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @Post()
  create(@Body() dto: CreateMailAccountDto) {
    return this.service.create(dto);
  }

  @Post(':id/update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMailAccountDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

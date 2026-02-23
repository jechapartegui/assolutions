import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateMailAccountDto, UpdateMailAccountDto } from './mail_account.dto';
import { MailAccountService } from './mail_account.service';

@Controller('mail-account')
export class MailAccountController {
  constructor(private readonly service: MailAccountService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list() {
    return this.service.list();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateMailAccountDto) {
    return this.service.create(dto);
  }

  // ✅ UPDATE via POST
  @UseGuards(JwtAuthGuard)
  @Post(':id/update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMailAccountDto) {
    return this.service.update(id, dto);
  }

  // ✅ DELETE via POST
  @UseGuards(JwtAuthGuard)
  @Post(':id/delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

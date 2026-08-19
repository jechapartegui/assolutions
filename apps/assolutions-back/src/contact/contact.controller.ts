import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { readOptionalProjectId } from '../common/access-control.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ContactService } from './contact.service';
import { CreateContactDto, UpdateContactDto } from './contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly service: ContactService) {}

  @UseGuards(JwtAuthGuard)
  @Post('list')
  list(@Req() req: any, @Body() body: { ids: number[] }) {
    return this.service.list(body.ids, req.user.id, readOptionalProjectId(req));
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.get(id, req.user.id, readOptionalProjectId(req));
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateContactDto) {
    return this.service.create(dto, req.user.id, readOptionalProjectId(req));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/update')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContactDto,
  ) {
    return this.service.update(id, dto, req.user.id, readOptionalProjectId(req));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/delete')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id, req.user.id, readOptionalProjectId(req));
  }
}

import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateNoteDto, UpdateNoteDto } from './note.dto';
import { NoteService } from './note.service';

@Controller('notes')
export class NoteController {
  constructor(private readonly service: NoteService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  listMine(@Req() req: any) {
    return this.service.listForAccount(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.getForAccount(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateNoteDto) {
    return this.service.create(dto, req.user.id);
  }

  // ✅ UPDATE via POST
  @UseGuards(JwtAuthGuard)
  @Post(':id/update')
  update(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body() dto: UpdateNoteDto) {
    return this.service.update(id, dto, req.user.id);
  }

  // ✅ DELETE via POST
  @UseGuards(JwtAuthGuard)
  @Post(':id/delete')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.remove(id, req.user.id);
  }
}

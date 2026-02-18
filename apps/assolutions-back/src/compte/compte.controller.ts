import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CompteService } from './compte.service';
import { CreateCompteDto, UpdateCompteDto } from './compte.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';

@Controller('comptes')
export class CompteController {
  constructor(private readonly service: CompteService) {}

@UseGuards(JwtAuthGuard, ProjectAdminGuard)
@Get()
list(@Req() req) {
  return this.service.list(req.projectId);
}

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @Post()
  create(@Body() dto: CreateCompteDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCompteDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

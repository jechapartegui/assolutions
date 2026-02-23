import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateSaisonDto, UpdateSaisonDto } from './saison.dto';
import { SaisonService } from './saison.service';

@Controller('saisons')
export class SaisonController {
  constructor(private readonly service: SaisonService) {}

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get()
  list(@ProjectId() projectId: number) {
    return this.service.listForProject(projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  create(@ProjectId() projectId: number, @Body() dto: CreateSaisonDto) {
    return this.service.create(dto, projectId );
  }

  // ✅ UPDATE via POST
  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSaisonDto) {
    return this.service.update(id, dto);
  }

  // ✅ DELETE via POST
  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

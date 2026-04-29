import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateCoursDto, UpdateCoursDto } from './cours.dto';
import { CoursService } from './cours.service';

@Controller('cours')
export class CoursController {
  constructor(private readonly service: CoursService) {}

  @UseGuards(JwtAuthGuard)
  @Get('saison/:saison_id')
  list(@Param('saison_id', ParseIntPipe) id: number) {
    return this.service.listForProject(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.getForProject(id, projectId);
  }

  @UseGuards(JwtAuthGuard,)
  @Post()
  create(@ProjectId() projectId: number, @Body() dto: CreateCoursDto) {
    return this.service.create(dto, projectId);
  }

  // ✅ UPDATE via POST (serveur friendly)
  @UseGuards(JwtAuthGuard)
  @Post(':id/update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateCoursDto,
  ) {
    return this.service.update(id, dto, projectId);
  }

  // ✅ DELETE via POST (tu l'as déjà)
  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  remove(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.remove(id, projectId);
  }
}

import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateCoursProfesseurDto, UpdateCoursProfesseurDto } from './cours_professeur.dto';
import { CoursProfesseurService } from './cours_professeur.service';

@Controller('cours-professeur')
export class CoursProfesseurController {
  constructor(private readonly service: CoursProfesseurService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@ProjectId() projectId: number) {
    return this.service.listForProject(projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.getForProject(id, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  create(@ProjectId() projectId: number, @Body() dto: CreateCoursProfesseurDto) {
    return this.service.create(dto, projectId);
  }

  // ✅ UPDATE via POST
  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  update(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number, @Body() dto: UpdateCoursProfesseurDto) {
    return this.service.update(id, dto, projectId);
  }

  // ✅ DELETE via POST
  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  remove(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.remove(id, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('by-cours')
  listProfsByCoursId(@Body() body: { coursId: number[] }) {
    return this.service.listProfsByCoursId(body.coursId);
  }
  
  @UseGuards(JwtAuthGuard)
  @Post('updatelist')
  updateList(@ProjectId() projectId: number, @Body() body: { coursId: number, profs: number[] }) {
    const { coursId, profs } = body;
    return this.service.updateList(coursId, profs, projectId);
  }
}

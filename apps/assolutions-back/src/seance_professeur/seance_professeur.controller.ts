import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateSeanceProfesseurDto, UpdateSeanceProfesseurDto } from './seance_professeur.dto';
import { SeanceProfesseurService } from './seance_professeur.service';

@Controller('seance-professeur')
export class SeanceProfesseurController {
  constructor(private readonly service: SeanceProfesseurService) {}

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get()
  list(@ProjectId() projectId: number) {
    return this.service.listForProject(projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.getForProject(id, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  create(@ProjectId() projectId: number, @Body() dto: CreateSeanceProfesseurDto) {
    return this.service.create(dto, projectId);
  }

  // ✅ UPDATE via POST
  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateSeanceProfesseurDto,
  ) {
    return this.service.update(id, dto, projectId);
  }

      @UseGuards(JwtAuthGuard)
    @Post('liste_by_ids_seance')
    listbyIdSeance(@Body() ids: number[]) {
      return this.service.listbyIdSeance(ids);
    }
          @UseGuards(JwtAuthGuard)
    @Post('liste_by_idcontrat')
    listbyIdProfesseurContract(@Body() ids: number[]) {
      return this.service.listbyIdProfesseurContract(ids);
    }

  // ✅ DELETE via POST
  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  remove(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.remove(id, projectId);
  }
}

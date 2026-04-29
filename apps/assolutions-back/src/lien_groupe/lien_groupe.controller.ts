import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateLienGroupeDto, UpdateLienGroupeDto } from './lien_groupe.dto';
import { LienGroupeService } from './lien_groupe.service';

@Controller('lien-groupe')
export class LienGroupeController {
  constructor(private readonly service: LienGroupeService) {}

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
  create(@ProjectId() projectId: number, @Body() dto: CreateLienGroupeDto) {
    return this.service.create(dto, projectId);
  }

  // ✅ UPDATE via POST
  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateLienGroupeDto,
  ) {
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
  listGroupesByCoursId(@Body() body: { coursId: number[] }) {
    return this.service.listGroupesByCoursId(body.coursId);
  }
    @UseGuards(JwtAuthGuard)
  @Post('by-seance')
  listGroupesBySeanceId(@Body() body: { seanceId: number[] }) {
    return this.service.listGroupesBySeanceId(body.seanceId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('by-personne')
  listGroupesByPersonneId(@Body() body: { personneId: number[] }) {
    return this.service.listGroupesByPersonneId(body.personneId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('lienGroupeByPersonne')
  lienGroupeByPersonne(@Body() body: { personneId: number, saisonId: number }) {
    return this.service.lienGroupeByPersonne(body.personneId, body.saisonId);
  }


  @UseGuards(JwtAuthGuard)
  @Post('updateGroupesForSeance')
  updateGroupesForSeance(@ProjectId() projectId: number, @Body() body: { seanceId: number, groupeIds: number[] }) {
    const { seanceId, groupeIds } = body;
    return this.service.updateGroupesForSeance(seanceId, groupeIds, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('updateGroupesForCours')
  updateGroupesForCours(@ProjectId() projectId: number, @Body() body: { coursId: number, groupeIds: number[] }) {
    const { coursId, groupeIds} = body;
    return this.service.updateGroupesForCours(coursId, groupeIds, projectId);
  }
}


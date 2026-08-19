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
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAccessGuard } from '../common/guards/project-access.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateLienGroupeDto, UpdateLienGroupeDto } from './lien_groupe.dto';
import { LienGroupeService } from './lien_groupe.service';

@Controller('lien-groupe')
export class LienGroupeController {
  constructor(private readonly service: LienGroupeService) {}

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Get()
  list(@ProjectId() projectId: number) {
    return this.service.listForProject(projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Post('by-cours')
  listGroupesByCoursId(
    @ProjectId() projectId: number,
    @Body() body: { coursId: number[] },
  ) {
    return this.service.listGroupesByCoursId(body.coursId, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Post('by-seance')
  listGroupesBySeanceId(
    @ProjectId() projectId: number,
    @Body() body: { seanceId: number[] },
  ) {
    return this.service.listGroupesBySeanceId(body.seanceId, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Post('by-personne')
  listGroupesByPersonneId(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Body() body: { personneId: number[] },
  ) {
    return this.service.listGroupesByPersonneId(
      body.personneId,
      projectId,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Post('lienGroupeByPersonne')
  lienGroupeByPersonne(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Body() body: { personneId: number; saisonId: number },
  ) {
    return this.service.lienGroupeByPersonne(
      body.personneId,
      body.saisonId,
      projectId,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post('updateGroupesForSeance')
  updateGroupesForSeance(
    @ProjectId() projectId: number,
    @Body() body: { seanceId: number; groupeIds: number[] },
  ) {
    return this.service.updateGroupesForSeance(
      body.seanceId,
      body.groupeIds,
      projectId,
    );
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post('updateGroupesForCours')
  updateGroupesForCours(
    @ProjectId() projectId: number,
    @Body() body: { coursId: number; groupeIds: number[] },
  ) {
    return this.service.updateGroupesForCours(
      body.coursId,
      body.groupeIds,
      projectId,
    );
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':objectId/:groupeId/:type/delete')
  removeIdFromGroupe(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Param('objectId', ParseIntPipe) objectId: number,
    @Param('groupeId', ParseIntPipe) groupeId: number,
    @Param('type') type: string,
  ) {
    return this.service.removeIdFromGroupe(
      objectId,
      groupeId,
      type,
      projectId,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Get(':id')
  get(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.getForProject(id, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  create(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Body() dto: CreateLienGroupeDto,
  ) {
    return this.service.create(dto, projectId, req.user.id);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateLienGroupeDto,
  ) {
    return this.service.update(id, dto, projectId, req.user.id);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.remove(id, projectId);
  }
}

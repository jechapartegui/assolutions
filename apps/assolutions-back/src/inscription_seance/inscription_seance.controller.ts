import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateInscriptionSeanceDto, UpdateInscriptionSeanceDto } from './inscription_seance.dto';
import { InscriptionSeanceService } from './inscription_seance.service';

@Controller('inscription-seance')
export class InscriptionSeanceController {
  constructor(private readonly service: InscriptionSeanceService) {}

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get()
  list(@ProjectId() projectId: number) {
    return this.service.listForProject(projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get(':personneId/:seanceId')
  get(
    @Param('personneId', ParseIntPipe) personneId: number,
    @Param('seanceId', ParseIntPipe) seanceId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.getForProject(personneId, seanceId, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  create(@ProjectId() projectId: number, @Body() dto: CreateInscriptionSeanceDto) {
    return this.service.create(dto, projectId);
  }

  // ✅ UPDATE via POST
  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':personneId/:seanceId/update')
  update(
    @Param('personneId', ParseIntPipe) personneId: number,
    @Param('seanceId', ParseIntPipe) seanceId: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateInscriptionSeanceDto,
  ) {
    return this.service.update(personneId, seanceId, dto, projectId);
  }

  // ✅ DELETE via POST
  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':personneId/:seanceId/delete')
  remove(
    @Param('personneId', ParseIntPipe) personneId: number,
    @Param('seanceId', ParseIntPipe) seanceId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.remove(personneId, seanceId, projectId);
  }
}

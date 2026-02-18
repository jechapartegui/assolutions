import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
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

  // PK composite -> URL: /inscription-seance/:personneId/:seanceId
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

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Patch(':personneId/:seanceId')
  update(
    @Param('personneId', ParseIntPipe) personneId: number,
    @Param('seanceId', ParseIntPipe) seanceId: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateInscriptionSeanceDto,
  ) {
    return this.service.update(personneId, seanceId, dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Delete(':personneId/:seanceId')
  remove(
    @Param('personneId', ParseIntPipe) personneId: number,
    @Param('seanceId', ParseIntPipe) seanceId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.remove(personneId, seanceId, projectId);
  }
}

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
import { ProjectStaffGuard } from '../common/guards/project-staff.guard';
import {
  CreateInscriptionSeanceDto,
  UpdateInscriptionSeanceDto,
} from './inscription_seance.dto';
import { InscriptionSeanceService } from './inscription_seance.service';

@Controller('inscription-seance')
export class InscriptionSeanceController {
  constructor(private readonly service: InscriptionSeanceService) {}

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Post('maj')
  maj(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Body() dto: CreateInscriptionSeanceDto,
  ) {
    return this.service.upsert(dto, projectId, req.user.id);
  }

  @UseGuards(JwtAuthGuard, ProjectStaffGuard)
  @Get('full/:seanceId')
  full(
    @ProjectId() projectId: number,
    @Param('seanceId', ParseIntPipe) seanceId: number,
  ) {
    return this.service.full(seanceId, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectStaffGuard)
  @Get('saison/uniqueid/:saisonId')
  listBySaisonUniqueId(
    @Param('saisonId', ParseIntPipe) saisonId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.listBySaisonUniqueId(saisonId, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectStaffGuard)
  @Get('saison/:saisonId')
  listBySaison(
    @Param('saisonId', ParseIntPipe) saisonId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.listBySaison(saisonId, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Get('personne/:personneId/saison/:saisonId')
  listByPersonneAndSaison(
    @Req() req: any,
    @Param('personneId', ParseIntPipe) personneId: number,
    @Param('saisonId', ParseIntPipe) saisonId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.listByPersonneAndSaison(
      personneId,
      saisonId,
      projectId,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Get('compte/:login/seance/:seanceId')
  getAdherentCompte(
    @Req() req: any,
    @Param('login') login: string,
    @Param('seanceId', ParseIntPipe) seanceId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.getAdherentCompte(
      login,
      seanceId,
      projectId,
      req.user.id,
      req.user.login,
    );
  }

  @UseGuards(JwtAuthGuard, ProjectStaffGuard)
  @Get()
  list(@ProjectId() projectId: number) {
    return this.service.listForProject(projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Post()
  create(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Body() dto: CreateInscriptionSeanceDto,
  ) {
    return this.service.create(dto, projectId, req.user.id);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Post(':personneId/:seanceId/update')
  update(
    @Req() req: any,
    @Param('personneId', ParseIntPipe) personneId: number,
    @Param('seanceId', ParseIntPipe) seanceId: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateInscriptionSeanceDto,
  ) {
    return this.service.update(
      personneId,
      seanceId,
      dto,
      projectId,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Post(':personneId/:seanceId/delete')
  remove(
    @Req() req: any,
    @Param('personneId', ParseIntPipe) personneId: number,
    @Param('seanceId', ParseIntPipe) seanceId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.remove(personneId, seanceId, projectId, req.user.id);
  }

  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @Get(':personneId/:seanceId')
  get(
    @Req() req: any,
    @Param('personneId', ParseIntPipe) personneId: number,
    @Param('seanceId', ParseIntPipe) seanceId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.getForProject(
      personneId,
      seanceId,
      projectId,
      req.user.id,
    );
  }
}

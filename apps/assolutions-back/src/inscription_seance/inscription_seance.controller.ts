import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateInscriptionSeanceDto, UpdateInscriptionSeanceDto } from './inscription_seance.dto';
import { InscriptionSeanceService } from './inscription_seance.service';

@Controller('inscription-seance')
export class InscriptionSeanceController {
  constructor(private readonly service: InscriptionSeanceService) {}
// ✅ UPSERT (create if missing, else update)
@UseGuards(JwtAuthGuard)
@Post('maj')
maj(@ProjectId() projectId: number, @Body() dto: CreateInscriptionSeanceDto) {
  return this.service.upsert(dto, projectId);
}

@UseGuards(JwtAuthGuard)
@Get('full/:seanceId')
full(@ProjectId() projectId: number, @Param('seanceId', ParseIntPipe) seanceId: number) {
  return this.service.full(seanceId, projectId);
}

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@ProjectId() projectId: number) {
    return this.service.listForProject(projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':personneId/:seanceId')
  get(
    @Param('personneId', ParseIntPipe) personneId: number,
    @Param('seanceId', ParseIntPipe) seanceId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.getForProject(personneId, seanceId, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@ProjectId() projectId: number, @Body() dto: CreateInscriptionSeanceDto) {
    return this.service.create(dto, projectId);
  }

  // ✅ UPDATE via POST
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  @Post(':personneId/:seanceId/delete')
  remove(
    @Param('personneId', ParseIntPipe) personneId: number,
    @Param('seanceId', ParseIntPipe) seanceId: number
  ) {
    return this.service.remove(personneId, seanceId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('saison/:saisonId')
  listBySaison(@Param('saisonId', ParseIntPipe) saisonId: number) {
    return this.service.listBySaison(saisonId);
  }
  @UseGuards(JwtAuthGuard)
  @Get('saison/uniqueid/:saisonId')
  listBySaison_UniqueID(@Param('saisonId', ParseIntPipe) saisonId: number) {
    return this.service.listBySaison_UniqueID(saisonId);
  }

@UseGuards(JwtAuthGuard)
@Get('personne/:personneId/saison/:saisonId')
listByPersonneAndSaison(
  @Param('personneId', ParseIntPipe) personneId: number,
  @Param('saisonId', ParseIntPipe) saisonId: number,
) {
  return this.service.listByPersonneAndSaison(personneId, saisonId);
}
@UseGuards(JwtAuthGuard)
@Get('compte/:login/seance/:seanceId')
GetAdherentCompte(
  @Param('login') login: string,
  @Param('seanceId', ParseIntPipe) seanceId: number,
) {
  return this.service.GetAdherentCompte(login, seanceId);
}
}

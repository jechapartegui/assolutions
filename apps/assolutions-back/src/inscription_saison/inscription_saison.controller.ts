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
import { readOptionalProjectId } from '../common/access-control.service';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateInscriptionSaisonDto, UpdateInscriptionSaisonDto } from './inscription_saison.dto';
import { InscriptionSaisonService } from './inscription_saison.service';

@Controller('inscription-saison')
export class InscriptionSaisonController {
  constructor(private readonly service: InscriptionSaisonService) {}

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
  create(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Body() dto: CreateInscriptionSaisonDto,
  ) {
    return this.service.create(dto, projectId, req.user.id);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateInscriptionSaisonDto,
  ) {
    return this.service.update(id, dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.remove(id, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('by-personnes')
  listByPersonnes(
    @Req() req: any,
    @Body() body: { personneIds: number[] },
  ) {
    return this.service.listByPersonnes(
      body.personneIds,
      req.user.id,
      readOptionalProjectId(req),
    );
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get('saison/:saisonId')
  listBySaison(
    @Param('saisonId', ParseIntPipe) saisonId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.listForSaison(saisonId, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('personne/:personneId')
  listByPersonne(
    @Req() req: any,
    @Param('personneId', ParseIntPipe) personneId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.listForPersonne(personneId, projectId, req.user.id);
  }
}

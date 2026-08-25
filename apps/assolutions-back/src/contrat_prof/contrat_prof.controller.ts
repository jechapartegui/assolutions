import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccessControlService } from '../common/access-control.service';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { CreateContratProfDto, UpdateContratProfDto } from './contrat_prof.dto';
import { ContratProfService } from './contrat_prof.service';

@Controller('contrat-prof')
export class ContratProfController {
  constructor(
    private readonly service: ContratProfService,
    private readonly access: AccessControlService,
  ) {}

  /**
   * Cette route sert à la fois aux écrans d'administration et aux références
   * du menu adhérent.
   *
   * - un administrateur du projet reçoit les contrats complets ;
   * - un membre rattaché au projet reçoit uniquement l'identité publique du
   *   professeur et l'identifiant du contrat nécessaires à l'affichage.
   *
   * Les données contractuelles (rémunération, dates, détails...) ne sont donc
   * jamais exposées au simple adhérent.
   */
  @UseGuards(JwtAuthGuard)
  @Get('saison/:saisonId')
  async listForSeason(
    @Req() req: any,
    @Param('saisonId', ParseIntPipe) saisonId: number,
    @ProjectId() projectId: number,
  ) {
    const userId = Number(req.user?.id);

    try {
      await this.access.assertProjectAdmin(userId, projectId);
      return this.service.listForSeason(saisonId, projectId);
    } catch (error) {
      if (!(error instanceof ForbiddenException)) throw error;
    }

    await this.access.assertAccountHasProjectContext(userId, projectId);
    return this.service.listLightsForSeason(saisonId, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.getForProject(id, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post()
  create(@ProjectId() projectId: number, @Body() dto: CreateContratProfDto) {
    return this.service.create(dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Body() dto: UpdateContratProfDto,
  ) {
    return this.service.update(id, dto, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Post(':id/delete')
  remove(@Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number) {
    return this.service.remove(id, projectId);
  }

  @UseGuards(JwtAuthGuard, ProjectAdminGuard)
  @Get('exist/:profId')
  exist(
    @Param('profId', ParseIntPipe) profId: number,
    @ProjectId() projectId: number,
  ) {
    return this.service.exist(profId, projectId);
  }
}

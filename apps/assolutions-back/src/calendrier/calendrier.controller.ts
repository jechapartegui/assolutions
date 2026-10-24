import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AccessControlService } from '../common/access-control.service';
import { CalendrierService } from './calendrier.service';
import { CalendrierSyncService } from './calendrier-sync.service';
import { GoogleCalendrierClient } from './google-calendrier.client';
import { CalendrierWorkerService } from './calendrier-worker.service';
import { CreateCalendrierDto, UpdateCalendrierDto, SynchroniserCalendrierDto, ImportGoogleReponsesDto, RepondreCalendrierEvenementDto } from './calendrier.dto';

@Controller('calendriers')
@UseGuards(JwtAuthGuard)
export class CalendrierController {
  constructor(
    private readonly service: CalendrierService,
    private readonly sync: CalendrierSyncService,
    private readonly access: AccessControlService,
    private readonly google: GoogleCalendrierClient,
    private readonly worker: CalendrierWorkerService,
  ) {}

  /** EXG-06 : test du propriétaire OAuth sans creation d'agenda ni d'evenement. */
  @Get('google/etat')
  async googleEtat(@Req() req: any, @ProjectId() projectId: number) {
    await this.access.assertProjectAdmin(req.user.id, projectId);
    return this.google.checkConnection();
  }

  /** EXG-17 : lire l'etat du worker pour un calendrier du projet, sans le declencher. */
  @Get('google/worker-etat')
  async workerEtat(
    @Req() req: any, @ProjectId() projectId: number,
    @Query('calendrier_id', ParseIntPipe) calendrierId: number,
  ) {
    await this.access.assertProjectAdmin(req.user.id, projectId);
    return this.worker.etat(projectId, calendrierId);
  }

  @Get('mes')
  async mes(@Req() req: any, @ProjectId() projectId: number) {
    await this.access.assertAccountHasProjectContext(req.user.id, projectId);
    return this.service.mes(req.user.id, projectId);
  }

  @Get()
  async list(
    @Req() req: any, @ProjectId() projectId: number,
    @Query('saison_id') saison?: string,
  ) {
    await this.access.assertProjectStaff(req.user.id, projectId);
    const saisonId = saison === undefined ? undefined : Number(saison);
    return this.service.list(projectId, saisonId);
  }

  /** Événements visibles pour un compte, réponse seulement pour les éligibles. */
  @Get('mes/evenements')
  async mesEvenements(@Req() req: any, @ProjectId() projectId: number) {
    await this.access.assertAccountHasProjectContext(req.user.id, projectId);
    return this.service.mesEvenements(Number(req.user.id), projectId);
  }

  @Post('mes/evenements/:seanceId/repondre')
  async repondreEvenement(
    @Req() req: any,
    @ProjectId() projectId: number,
    @Param('seanceId', ParseIntPipe) seanceId: number,
    @Body() dto: RepondreCalendrierEvenementDto,
  ) {
    await this.access.assertAccountHasProjectContext(req.user.id, projectId);
    return this.service.repondreEvenement(
      Number(req.user.id), projectId, seanceId, dto.personne_id, dto.reponse,
    );
  }

  @Get(':id/seances')
  async seances(
    @Req() req: any, @Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number,
  ) {
    await this.access.assertProjectStaff(req.user.id, projectId);
    return this.service.seances(id, projectId);
  }

  @Get(':id/preview')
  async preview(
    @Req() req: any, @Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number,
  ) {
    await this.access.assertProjectAdmin(req.user.id, projectId);
    return this.service.preview(id, projectId);
  }

  @Get(':id/reponses-google')
  async responses(
    @Req() req: any, @Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number,
  ) {
    await this.access.assertProjectAdmin(req.user.id, projectId);
    return this.sync.googleResponses(id, projectId);
  }

  @Get(':id')
  async get(
    @Req() req: any, @Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number,
  ) {
    await this.access.assertProjectStaff(req.user.id, projectId);
    return this.service.get(id, projectId);
  }

  @Post()
  async create(@Req() req: any, @ProjectId() projectId: number, @Body() dto: CreateCalendrierDto) {
    await this.access.assertProjectAdmin(req.user.id, projectId);
    return this.service.create(dto, projectId);
  }

  @Post(':id/update')
  async update(
    @Req() req: any, @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number, @Body() dto: UpdateCalendrierDto,
  ) {
    await this.access.assertProjectStaff(req.user.id, projectId);
    // EXG-29 : les professeurs peuvent modifier un calendrier existant,
    // mais pas changer les options de notifications Google ni l'archiver.
    const current = await this.service.get(id, projectId);
    if ((dto.notifier_mises_a_jour !== undefined &&
         dto.notifier_mises_a_jour !== current.notifier_mises_a_jour) ||
        (dto.actif !== undefined && dto.actif !== current.actif)) {
      await this.access.assertProjectAdmin(req.user.id, projectId);
    }
    return this.service.update(id, dto, projectId);
  }

  @Post(':id/archive')
  async archive(
    @Req() req: any, @Param('id', ParseIntPipe) id: number, @ProjectId() projectId: number,
  ) {
    await this.access.assertProjectAdmin(req.user.id, projectId);
    return this.service.archive(id, projectId);
  }

  @Post(':id/importer-reponses')
  async importerReponses(
    @Req() req: any, @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number, @Body() dto: ImportGoogleReponsesDto,
  ) {
    await this.access.assertProjectAdmin(req.user.id, projectId);
    return this.sync.importGoogleResponses(id, projectId, Number(req.user.id), dto);
  }

  @Post(':id/synchroniser')
  async synchroniser(
    @Req() req: any, @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number, @Body() dto: SynchroniserCalendrierDto,
  ) {
    await this.access.assertProjectAdmin(req.user.id, projectId);
    if (dto.mode === 'preview') return this.service.preview(id, projectId);
    return this.sync.sync(id, projectId, dto.notifier === true);
  }
}

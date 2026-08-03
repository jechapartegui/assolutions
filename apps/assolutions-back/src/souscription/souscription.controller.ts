import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { ProjectId } from '../common/decorators/project-id.decorator';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { SouscriptionContextEnricherService } from '../exigence-dossier/souscription-context-enricher.service';
import { SouscriptionDossierService } from '../exigence-dossier/souscription-dossier.service';
import { SouscriptionNotificationService } from '../exigence-dossier/souscription-notification.service';
import { SouscriptionViewEnricherService } from '../exigence-dossier/souscription-view-enricher.service';
import {
  CompleteSouscriptionPersonneDto,
  SaveSouscriptionDto,
  SimulerPaiementDto,
  ValidateCodePromoDto,
} from './souscription.dto';
import { SouscriptionService } from './souscription.service';

type AuthenticatedRequest = Request & { user?: { id?: number } };

type AdminSaveSouscriptionDto = SaveSouscriptionDto & { compte_id: number };

@Controller('souscriptions')
export class SouscriptionController {
  constructor(
    private readonly service: SouscriptionService,
    private readonly contexts: SouscriptionContextEnricherService,
    private readonly dossiers: SouscriptionDossierService,
    private readonly views: SouscriptionViewEnricherService,
    private readonly notifications: SouscriptionNotificationService,
  ) {}

  @Get('contexte/:saisonId')
  async getContext(
    @Param('saisonId', ParseIntPipe) saisonId: number,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const context = await this.service.getContext(
      saisonId,
      projectId,
      this.accountId(req),
    );
    await this.contexts.enrich(context, saisonId);
    if (context.brouillon) {
      context.brouillon = await this.views.subscription(context.brouillon);
    }
    return this.views.context(context);
  }

  @UseGuards(ProjectAdminGuard)
  @Get('admin/contexte/:saisonId/:compteId')
  async getAdminContext(
    @Param('saisonId', ParseIntPipe) saisonId: number,
    @Param('compteId', ParseIntPipe) compteId: number,
    @ProjectId() projectId: number,
  ) {
    const context = await this.service.getContext(saisonId, projectId, compteId);
    await this.contexts.enrich(context, saisonId);
    if (context.brouillon) {
      context.brouillon = await this.views.subscription(context.brouillon);
    }
    return this.views.context(context);
  }

  @Post('personnes/:id/completer')
  async completePerson(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteSouscriptionPersonneDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const accountId = this.accountId(req);
    await this.service.completePerson(id, dto, accountId);
    await this.dossiers.completeCountry(id, dto.pays, accountId);
    return { ok: true };
  }

  @Post('codes-promo/valider')
  validatePromo(
    @Body() dto: ValidateCodePromoDto,
    @ProjectId() projectId: number,
  ) {
    return this.service.validateCodePromo(dto, projectId);
  }

  @Post('brouillon')
  async saveDraft(
    @Body() dto: SaveSouscriptionDto,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.contexts.assertNotAlreadyRegistered(dto);
    const accountId = this.accountId(req);
    const saved = await this.service.saveDraft(dto, projectId, accountId);
    await this.dossiers.syncDraft(saved.id, dto, projectId, accountId);
    const view = await this.service.getForAccount(saved.id, projectId, accountId);
    return this.views.subscription(view);
  }

  @UseGuards(ProjectAdminGuard)
  @Post('admin/brouillon')
  async saveAdminDraft(
    @Body() dto: AdminSaveSouscriptionDto,
    @ProjectId() projectId: number,
  ) {
    const { compte_id, ...payload } = dto;
    await this.contexts.assertNotAlreadyRegistered(payload);
    const saved = await this.service.saveDraft(payload, projectId, Number(compte_id));
    await this.dossiers.syncDraft(saved.id, payload, projectId, Number(compte_id));
    const view = await this.service.getForAccount(
      saved.id,
      projectId,
      Number(compte_id),
    );
    return this.views.subscription(view);
  }

  @Get(':id')
  async get(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const view = await this.service.getForAccount(
      id,
      projectId,
      this.accountId(req),
    );
    return this.views.subscription(view);
  }

  @Post(':id/dossier')
  dossier(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dossiers.validateAndSnapshot(
      id,
      projectId,
      this.accountId(req),
      false,
    );
  }

  @Post(':id/checkout')
  async checkout(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const accountId = this.accountId(req);
    await this.dossiers.validateAndSnapshot(id, projectId, accountId, true);
    const result = await this.service.createCheckout(id, projectId, accountId);
    await this.notifications.sendCurrentState(id, projectId, accountId);
    return result;
  }

  @Post(':id/simuler-paiement')
  async simulate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SimulerPaiementDto,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const accountId = this.accountId(req);
    const result = await this.dossiers.simulatePayment(
      id,
      dto.resultat,
      projectId,
      accountId,
    );
    await this.notifications.sendCurrentState(id, projectId, accountId);
    return result;
  }

  @UseGuards(ProjectAdminGuard)
  @Post('admin/:id/valider-paiement/:compteId')
  async validateManualPayment(
    @Param('id', ParseIntPipe) id: number,
    @Param('compteId', ParseIntPipe) compteId: number,
    @ProjectId() projectId: number,
  ) {
    const result = await this.dossiers.validateManualPayment(
      id,
      projectId,
      compteId,
    );
    await this.notifications.sendCurrentState(id, projectId, compteId);
    return result;
  }

  @Post(':id/confirmer')
  async confirm(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const accountId = this.accountId(req);
    const result = await this.service.confirmPayment(id, projectId, accountId);
    await this.notifications.sendCurrentState(id, projectId, accountId);
    return result;
  }

  @Post(':id/annuler')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.cancel(id, projectId, this.accountId(req));
  }

  @Post('helloasso/webhook')
  async webhook(@Body() payload: unknown) {
    const result = await this.service.handleHelloAssoWebhook(payload);
    await this.notifications.sendFromWebhook(payload);
    return result;
  }

  private accountId(req: AuthenticatedRequest): number {
    const id = Number(req.user?.id);
    if (!id) throw new UnauthorizedException('Compte authentifié introuvable');
    return id;
  }
}

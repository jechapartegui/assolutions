import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { ProjectId } from '../common/decorators/project-id.decorator';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';
import { SouscriptionAdminService } from '../exigence-dossier/souscription-admin.service';
import { SouscriptionContextEnricherService } from '../exigence-dossier/souscription-context-enricher.service';
import { SouscriptionDossierService } from '../exigence-dossier/souscription-dossier.service';
import { SouscriptionMedicalGuardService } from '../exigence-dossier/souscription-medical-guard.service';
import { SouscriptionNotificationService } from '../exigence-dossier/souscription-notification.service';
import { SouscriptionViewEnricherService } from '../exigence-dossier/souscription-view-enricher.service';
import {
  CompleteSouscriptionPersonneDto,
  SaveSouscriptionDto,
  SimulerPaiementDto,
  ValidateCodePromoDto,
} from './souscription.dto';
import { SouscriptionCapacityService } from './souscription-capacity.service';
import { SouscriptionConfirmationService } from './souscription-confirmation.service';
import { SouscriptionFinanceService } from './souscription-finance.service';
import { SouscriptionMonitorService } from './souscription-monitor.service';
import { SouscriptionService } from './souscription.service';
import { SouscriptionWebhookResolverService } from './souscription-webhook-resolver.service';

type AuthenticatedRequest = Request & { user?: { id?: number } };
type AdminSaveSouscriptionDto = SaveSouscriptionDto & { compte_id: number };

@Controller('souscriptions')
export class SouscriptionController {
  constructor(
    private readonly service: SouscriptionService,
    private readonly capacity: SouscriptionCapacityService,
    private readonly confirmation: SouscriptionConfirmationService,
    private readonly finance: SouscriptionFinanceService,
    private readonly admin: SouscriptionAdminService,
    private readonly contexts: SouscriptionContextEnricherService,
    private readonly dossiers: SouscriptionDossierService,
    private readonly medicalGuard: SouscriptionMedicalGuardService,
    private readonly views: SouscriptionViewEnricherService,
    private readonly notifications: SouscriptionNotificationService,
    private readonly webhookResolver: SouscriptionWebhookResolverService,
    private readonly monitor: SouscriptionMonitorService,
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
  @Get('admin/suivi')
  monitorList(
    @ProjectId() projectId: number,
    @Query('search') search?: string,
    @Query('statut') statut?: string,
    @Query('saison_id') saisonIdRaw?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    const saisonId = Number(saisonIdRaw ?? 0) || null;
    return this.monitor.list(projectId, {
      search,
      statut,
      saisonId,
      dateFrom: this.safeDate(dateFrom),
      dateTo: this.safeDate(dateTo),
    });
  }

  @UseGuards(ProjectAdminGuard)
  @Get('admin/suivi/:id')
  monitorDetail(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
  ) {
    return this.monitor.detail(id, projectId);
  }

  @UseGuards(ProjectAdminGuard)
  @Get('admin/contexte/:saisonId/:compteId')
  async getAdminContext(
    @Param('saisonId', ParseIntPipe) saisonId: number,
    @Param('compteId', ParseIntPipe) compteId: number,
    @ProjectId() projectId: number,
  ) {
    return this.buildAdminContext(saisonId, compteId, projectId);
  }

  @UseGuards(ProjectAdminGuard)
  @Get('admin/contexte-personne/:saisonId/:personneId')
  async getAdminContextFromPerson(
    @Param('saisonId', ParseIntPipe) saisonId: number,
    @Param('personneId', ParseIntPipe) personneId: number,
    @ProjectId() projectId: number,
  ) {
    const compteId = await this.contexts.accountIdForPerson(personneId);
    return this.buildAdminContext(
      saisonId,
      compteId,
      projectId,
      personneId,
    );
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
    await this.capacity.assertDraftCapacity(dto);
    const accountId = this.accountId(req);
    const saved = await this.service.saveDraft(dto, projectId, accountId);
    await this.dossiers.syncDraft(saved.id, dto, projectId, accountId);
    return this.views.subscription(
      await this.service.getForAccount(saved.id, projectId, accountId),
    );
  }

  @UseGuards(ProjectAdminGuard)
  @Post('admin/brouillon')
  async saveAdminDraft(
    @Body() dto: AdminSaveSouscriptionDto,
    @ProjectId() projectId: number,
  ) {
    const { compte_id, ...payload } = dto;
    await this.contexts.assertNotAlreadyRegistered(payload);
    await this.capacity.assertDraftCapacity(payload);
    const accountId = Number(compte_id);
    const saved = await this.service.saveDraft(payload, projectId, accountId);
    await this.dossiers.syncDraft(saved.id, payload, projectId, accountId);
    return this.views.subscription(
      await this.service.getForAccount(saved.id, projectId, accountId),
    );
  }

  @Get(':id')
  async get(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.views.subscription(
      await this.service.getForAccount(id, projectId, this.accountId(req)),
    );
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
    await this.capacity.assertSubscriptionCapacity(id);
    await this.medicalGuard.assertComplete(id, projectId, accountId);
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
    if (dto.resultat === 'OK') {
      await this.capacity.assertSubscriptionCapacity(id);
      await this.medicalGuard.assertComplete(id, projectId, accountId);
    }
    const result = await this.dossiers.simulatePayment(
      id,
      dto.resultat,
      projectId,
      accountId,
    );
    await this.finance.ensureForFinalized(id, projectId);
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
    await this.capacity.assertSubscriptionCapacity(id);
    await this.medicalGuard.assertComplete(id, projectId, compteId);
    const result = await this.admin.validateManualPayment(
      id,
      projectId,
      compteId,
    );
    await this.finance.ensureForFinalized(id, projectId);
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
    await this.capacity.assertSubscriptionCapacity(id);
    const result = await this.confirmation.confirmWithRetry(
      id,
      projectId,
      accountId,
    );
    await this.finance.ensureForFinalized(id, projectId);
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
    const normalizedPayload = await this.webhookResolver.normalize(payload);
    await this.capacity.assertWebhookCapacity(normalizedPayload);
    const result = await this.service.handleHelloAssoWebhook(normalizedPayload);
    await this.finance.ensureFromWebhook(normalizedPayload);
    await this.notifications.sendFromWebhook(normalizedPayload);
    return result;
  }

  private async buildAdminContext(
    saisonId: number,
    compteId: number,
    projectId: number,
    selectedPersonId?: number,
  ) {
    const context: any = await this.service.getContext(
      saisonId,
      projectId,
      compteId,
    );
    await this.contexts.enrich(context, saisonId);
    context.admin_compte_id = compteId;
    context.admin_personne_id = selectedPersonId ?? null;
    if (context.brouillon) {
      context.brouillon = await this.views.subscription(context.brouillon);
    }
    return this.views.context(context);
  }

  private safeDate(value?: string): string | null {
    const date = String(value ?? '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  }

  private accountId(req: AuthenticatedRequest): number {
    const id = Number(req.user?.id);
    if (!id) {
      throw new UnauthorizedException('Compte authentifié introuvable');
    }
    return id;
  }
}

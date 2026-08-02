import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { ProjectId } from '../common/decorators/project-id.decorator';
import { SouscriptionDossierService } from '../exigence-dossier/souscription-dossier.service';
import {
  CompleteSouscriptionPersonneDto,
  SaveSouscriptionDto,
  SimulerPaiementDto,
  ValidateCodePromoDto,
} from './souscription.dto';
import { SouscriptionService } from './souscription.service';

type AuthenticatedRequest = Request & {
  user?: { id?: number };
};

@Controller('souscriptions')
export class SouscriptionController {
  constructor(
    private readonly service: SouscriptionService,
    private readonly dossiers: SouscriptionDossierService,
  ) {}

  @Get('contexte/:saisonId')
  getContext(
    @Param('saisonId', ParseIntPipe) saisonId: number,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.getContext(saisonId, projectId, this.accountId(req));
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
    const accountId = this.accountId(req);
    const saved = await this.service.saveDraft(dto, projectId, accountId);
    await this.dossiers.syncDraft(saved.id, dto, projectId, accountId);
    return this.service.getForAccount(saved.id, projectId, accountId);
  }

  @Get(':id')
  get(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.getForAccount(id, projectId, this.accountId(req));
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
    return this.service.createCheckout(id, projectId, accountId);
  }

  @Post(':id/simuler-paiement')
  simulate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SimulerPaiementDto,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dossiers.simulatePayment(
      id,
      dto.resultat,
      projectId,
      this.accountId(req),
    );
  }

  @Post(':id/confirmer')
  confirm(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.confirmPayment(id, projectId, this.accountId(req));
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
  webhook(@Body() payload: unknown) {
    return this.service.handleHelloAssoWebhook(payload);
  }

  private accountId(req: AuthenticatedRequest): number {
    const id = Number(req.user?.id);
    if (!id) throw new UnauthorizedException('Compte authentifié introuvable');
    return id;
  }
}

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
import {
  CompleteSouscriptionPersonneDto,
  SaveSouscriptionDto,
  ValidateCodePromoDto,
} from './souscription.dto';
import { SouscriptionService } from './souscription.service';

type AuthenticatedRequest = Request & {
  user?: { id?: number };
};

@Controller('souscriptions')
export class SouscriptionController {
  constructor(private readonly service: SouscriptionService) {}

  @Get('contexte/:saisonId')
  getContext(
    @Param('saisonId', ParseIntPipe) saisonId: number,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.getContext(saisonId, projectId, this.accountId(req));
  }

  @Post('personnes/:id/completer')
  completePerson(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteSouscriptionPersonneDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.completePerson(id, dto, this.accountId(req));
  }

  @Post('codes-promo/valider')
  validatePromo(
    @Body() dto: ValidateCodePromoDto,
    @ProjectId() projectId: number,
  ) {
    return this.service.validateCodePromo(dto, projectId);
  }

  @Post('brouillon')
  saveDraft(
    @Body() dto: SaveSouscriptionDto,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.saveDraft(dto, projectId, this.accountId(req));
  }

  @Get(':id')
  get(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.getForAccount(id, projectId, this.accountId(req));
  }

  @Post(':id/checkout')
  checkout(
    @Param('id', ParseIntPipe) id: number,
    @ProjectId() projectId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.createCheckout(id, projectId, this.accountId(req));
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

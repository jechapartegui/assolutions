// helloasso.controller.ts
import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  Headers,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CommandePaiementService } from '../services/commande-paiement.service';
import { HelloAssoService } from '../services/helloasso.service';

@Controller('payments/helloasso')
export class HelloAssoController {
  constructor(
    private readonly commandePaiementService: CommandePaiementService,
    private readonly helloAssoService: HelloAssoService,
  ) {}

  @Post('start/:commandeId')
  async start(@Param('commandeId') commandeId: string) {
    return this.commandePaiementService.startCheckout(Number(commandeId));
  }

  @Get('return')
  async handleReturn(
    @Query('checkoutIntentId') checkoutIntentId?: string,
    @Query('code') code?: string,
    @Query() query?: Record<string, any>,
  ) {
    if (!checkoutIntentId) {
      throw new BadRequestException('checkoutIntentId manquant.');
    }

    return this.commandePaiementService.markReturn(checkoutIntentId, code, query);
  }

  @Get('status')
  async getStatus(@Query('checkoutIntentId') checkoutIntentId?: string) {
    if (!checkoutIntentId) {
      throw new BadRequestException('checkoutIntentId manquant.');
    }

    return this.commandePaiementService.refreshStatusFromHelloAsso(checkoutIntentId);
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: Request & { rawBody?: string },
    @Body() body: any,
    @Headers('x-ha-signature') signature?: string,
  ) {
    const rawBody = req.rawBody ?? JSON.stringify(body);
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      undefined;

    // Pour une association simple, l'IP de notif peut déjà être un premier filtre
    if (!this.helloAssoService.isAllowedWebhookIp(ip)) {
      throw new BadRequestException('IP webhook non autorisée.');
    }

    // Pour les partenaires, HelloAsso propose en plus la signature HMAC
    const signatureConfigured = !!signature;
    if (signatureConfigured && !this.helloAssoService.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException('Signature webhook invalide.');
    }

    // Ici tu stockes body brut dans une table de log si tu veux
    const checkoutIntentId =
      body?.metadata?.checkoutIntentId ||
      body?.data?.metadata?.checkoutIntentId ||
      body?.data?.checkoutIntentId ||
      body?.checkoutIntentId;

    if (!checkoutIntentId) {
      return { received: true, ignored: true };
    }

    await this.commandePaiementService.refreshStatusFromHelloAsso(checkoutIntentId);

    return { received: true };
  }
}
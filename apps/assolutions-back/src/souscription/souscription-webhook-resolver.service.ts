import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { HelloAssoService } from '../helloasso/helloasso.service';
import { SouscriptionEntity } from './souscription.entity';

@Injectable()
export class SouscriptionWebhookResolverService {
  private readonly logger = new Logger(SouscriptionWebhookResolverService.name);

  constructor(
    @InjectRepository(SouscriptionEntity)
    private readonly souscriptionRepo: Repository<SouscriptionEntity>,
    private readonly helloAsso: HelloAssoService,
  ) {}

  async normalize(payload: unknown): Promise<unknown> {
    const checkoutId = this.helloAsso.extractCheckoutIntentId(payload);
    if (checkoutId) {
      this.logger.log(
        `[HELLOASSO_WEBHOOK] checkout=${checkoutId} source=payload`,
      );
      return payload;
    }

    const subscriptionId = this.helloAsso.extractSubscriptionId(payload);
    if (!subscriptionId) {
      this.logger.warn(
        '[HELLOASSO_WEBHOOK] notification ignorée : aucun checkoutIntentId ni souscription_id',
      );
      return payload;
    }

    const subscription = await this.souscriptionRepo.findOne({
      where: { id: subscriptionId },
    });

    const fallbackCheckoutId = Number(
      subscription?.helloasso_checkout_intent_id ?? 0,
    );
    if (!subscription || fallbackCheckoutId <= 0) {
      this.logger.warn(
        `[HELLOASSO_WEBHOOK] souscription=${subscriptionId} sans checkout HelloAsso exploitable`,
      );
      return payload;
    }

    this.logger.log(
      `[HELLOASSO_WEBHOOK] souscription=${subscriptionId} checkout=${fallbackCheckoutId} source=metadata`,
    );

    // On ajoute uniquement l'identifiant manquant. Le payload HelloAsso original
    // reste imbriqué afin que l'extraction des états de paiement continue de
    // fonctionner de la même manière dans les services existants.
    return {
      checkoutIntentId: fallbackCheckoutId,
      metadata: { souscription_id: subscriptionId },
      data: payload,
    };
  }
}

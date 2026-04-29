// commande-paiement.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CommandeAdhesion } from '@shared/index';
import { HelloAssoService } from './helloasso.service';

interface CommandeRepository {
  findById(id: number): Promise<CommandeAdhesion | null>;
  findByCheckoutIntentId(checkoutIntentId: string): Promise<CommandeAdhesion | null>;
  save(commande: CommandeAdhesion): Promise<CommandeAdhesion>;
}

@Injectable()
export class CommandePaiementService {
  constructor(
    private readonly helloAssoService: HelloAssoService,
    private readonly commandeRepository: CommandeRepository,
  ) {}

  async startCheckout(commandeId: number) {
    const commande = await this.commandeRepository.findById(commandeId);
    if (!commande) throw new NotFoundException('Commande introuvable.');

    const response = await this.helloAssoService.createCheckoutIntent(commande);

    commande.statutCommande = 'pending_payment';
    commande.helloAsso = {
      ...(commande.helloAsso ?? {}),
      checkoutIntentId: response.checkoutIntentId ?? response.id ?? null,
      redirectUrl: response.redirectUrl,
      status: 'created',
      payloadSent: {
        referenceCommande: commande.referenceCommande,
        montantTotal: commande.montantTotal,
      },
    };

    await this.commandeRepository.save(commande);

    return {
      redirectUrl: response.redirectUrl,
      checkoutIntentId: commande.helloAsso.checkoutIntentId,
      referenceCommande: commande.referenceCommande,
    };
  }

  async refreshStatusFromHelloAsso(checkoutIntentId: string) {
    const commande = await this.commandeRepository.findByCheckoutIntentId(checkoutIntentId);
    if (!commande) throw new NotFoundException('Commande introuvable.');

    const intent = await this.helloAssoService.getCheckoutIntent(checkoutIntentId);
    const status = this.helloAssoService.computePaymentStatus(intent);

    commande.helloAsso = {
      ...(commande.helloAsso ?? {}),
      checkoutIntentId,
      orderId: intent.order?.id ? String(intent.order.id) : null,
      payloadReturned: intent,
      status:
        status === 'paid'
          ? 'paid'
          : status === 'failed'
          ? 'failed'
          : 'returned',
    };

    if (status === 'paid') {
      commande.statutCommande = 'paid';
    } else if (status === 'failed') {
      commande.statutCommande = 'failed';
    } else {
      commande.statutCommande = 'pending_payment';
    }

    await this.commandeRepository.save(commande);

    return {
      statutCommande: commande.statutCommande,
      helloAssoStatus: commande.helloAsso.status,
      orderId: commande.helloAsso.orderId,
    };
  }

  async markReturn(checkoutIntentId: string, returnedCode?: string, query?: any) {
    const commande = await this.commandeRepository.findByCheckoutIntentId(checkoutIntentId);
    if (!commande) throw new NotFoundException('Commande introuvable.');

    commande.helloAsso = {
      ...(commande.helloAsso ?? {}),
      returnedCode: returnedCode ?? null,
      payloadReturned: query ?? null,
      status: 'returned',
    };

    await this.commandeRepository.save(commande);

    // Important : on ne valide pas ici, on réconcilie ensuite
    return this.refreshStatusFromHelloAsso(checkoutIntentId);
  }
}
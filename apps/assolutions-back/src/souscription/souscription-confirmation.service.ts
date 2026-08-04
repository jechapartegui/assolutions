import { Injectable } from '@nestjs/common';

import { SouscriptionService } from './souscription.service';

@Injectable()
export class SouscriptionConfirmationService {
  constructor(private readonly souscriptions: SouscriptionService) {}

  async confirmWithRetry(
    id: number,
    projectId: number,
    accountId: number,
  ) {
    let latest = await this.souscriptions.confirmPayment(
      id,
      projectId,
      accountId,
    );

    for (let attempt = 0; attempt < 11; attempt += 1) {
      if (
        latest.paiement_confirme ||
        latest.souscription.statut === 'FINALISEE'
      ) {
        return {
          ...latest,
          paiement_confirme: true,
          message: 'Paiement confirmé, inscription activée',
        };
      }

      if (this.isTerminalFailure(latest.souscription.helloasso_payment_state)) {
        return {
          ...latest,
          paiement_confirme: false,
          message: 'Le paiement a été refusé ou annulé',
        };
      }

      await this.wait(1_000);
      latest = await this.souscriptions.confirmPayment(
        id,
        projectId,
        accountId,
      );
    }

    const current = await this.souscriptions.getForAccount(
      id,
      projectId,
      accountId,
    );

    if (current.statut === 'FINALISEE') {
      return {
        souscription: current,
        paiement_confirme: true,
        message: 'Paiement confirmé, inscription activée',
      };
    }

    return {
      souscription: current,
      paiement_confirme: false,
      message:
        'Le paiement est encore en cours de synchronisation avec HelloAsso. Recharge cette page dans quelques secondes.',
    };
  }

  private isTerminalFailure(value: unknown): boolean {
    return [
      'REFUSED',
      'CANCELED',
      'CANCELLED',
      'FAILED',
      'ERROR',
    ].includes(String(value ?? '').trim().toUpperCase());
  }

  private wait(durationMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, durationMs));
  }
}

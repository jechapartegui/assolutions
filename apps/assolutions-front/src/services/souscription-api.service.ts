import { Injectable } from '@angular/core';
import {
  CodePromoValidationView,
  CompleteSouscriptionPersonneDto,
  SaveSouscriptionDto,
  SouscriptionCheckoutResponse,
  SouscriptionConfirmationResponse,
  SouscriptionContexte,
  SouscriptionView,
} from '@shared/index';

import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class SouscriptionApiService {
  private readonly base = '/souscriptions';

  constructor(private readonly api: ApiClientService) {}

  context(saisonId: number): Promise<SouscriptionContexte> {
    return this.api.GET<SouscriptionContexte>(
      `${this.base}/contexte/${Number(saisonId)}`,
    );
  }

  completePerson(
    personId: number,
    dto: CompleteSouscriptionPersonneDto,
  ): Promise<{ ok: true }> {
    return this.api.POST<{ ok: true }>(
      `${this.base}/personnes/${Number(personId)}/completer`,
      dto,
    );
  }

  validatePromo(
    saisonId: number,
    code: string,
    tariffIds: number[],
  ): Promise<CodePromoValidationView> {
    return this.api.POST<CodePromoValidationView>(
      `${this.base}/codes-promo/valider`,
      {
        saison_id: Number(saisonId),
        code,
        tarif_ids: tariffIds,
      },
    );
  }

  saveDraft(dto: SaveSouscriptionDto): Promise<SouscriptionView> {
    return this.api.POST<SouscriptionView>(`${this.base}/brouillon`, dto);
  }

  get(id: number): Promise<SouscriptionView> {
    return this.api.GET<SouscriptionView>(`${this.base}/${Number(id)}`);
  }

  dossier(id: number): Promise<unknown[]> {
    return this.api.POST<unknown[]>(`${this.base}/${Number(id)}/dossier`, {});
  }

  checkout(id: number): Promise<SouscriptionCheckoutResponse> {
    return this.api.POST<SouscriptionCheckoutResponse>(
      `${this.base}/${Number(id)}/checkout`,
      {},
    );
  }

  simulate(
    id: number,
    resultat: 'OK' | 'KO',
  ): Promise<{ paiement_confirme: boolean; message: string }> {
    return this.api.POST<{ paiement_confirme: boolean; message: string }>(
      `${this.base}/${Number(id)}/simuler-paiement`,
      { resultat },
    );
  }

  confirm(id: number): Promise<SouscriptionConfirmationResponse> {
    return this.api.POST<SouscriptionConfirmationResponse>(
      `${this.base}/${Number(id)}/confirmer`,
      {},
    );
  }

  cancel(id: number): Promise<{ ok: true }> {
    return this.api.POST<{ ok: true }>(
      `${this.base}/${Number(id)}/annuler`,
      {},
    );
  }
}

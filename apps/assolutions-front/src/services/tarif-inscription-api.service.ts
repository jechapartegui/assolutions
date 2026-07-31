import { Injectable } from '@angular/core';
import {
  CreateTarifInscriptionDto,
  TarifInscription,
  UpdateTarifInscriptionDto,
} from '@shared/index';

import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class TarifInscriptionApiService {
  private readonly base = '/tarifs-inscription';

  constructor(
    private readonly api: ApiClientService,
  ) {}

  list(saisonId: number): Promise<TarifInscription[]> {
    return this.api.GET<TarifInscription[]>(
      `${this.base}/saison/${Number(saisonId)}`,
    );
  }

  get(id: number): Promise<TarifInscription> {
    return this.api.GET<TarifInscription>(
      `${this.base}/${Number(id)}`,
    );
  }

  create(
    dto: CreateTarifInscriptionDto,
  ): Promise<TarifInscription> {
    return this.api.POST<TarifInscription>(
      this.base,
      dto,
    );
  }

  update(
    id: number,
    dto: UpdateTarifInscriptionDto,
  ): Promise<TarifInscription> {
    return this.api.POST<TarifInscription>(
      `${this.base}/${Number(id)}/update`,
      dto,
    );
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(
      `${this.base}/${Number(id)}/delete`,
      {},
    );
  }
}

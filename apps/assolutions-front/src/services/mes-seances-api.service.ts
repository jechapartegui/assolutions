import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { AdhMenDto } from '@shared/index';

@Injectable({ providedIn: 'root' })
export class MesSeancesApiService {
  private readonly base = '/mes-seances';

  constructor(private api: ApiClientService) {}

  get(): Promise<AdhMenDto []> {
    return this.api.GET<AdhMenDto[]>(this.base+ `/adherent`);
  }
    prof(): Promise<AdhMenDto[]> {
    return this.api.GET<AdhMenDto[]>(this.base+ `/prof`);
  }

}

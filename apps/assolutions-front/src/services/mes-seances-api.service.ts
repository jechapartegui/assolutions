import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { ProjetView } from '@shared/lib/compte.interface';
import { AdherentSeance_VM } from '@shared/index';

@Injectable({ providedIn: 'root' })
export class MesSeancesApiService {
  private readonly base = '/mes-seances';

  constructor(private api: ApiClientService) {}

  get(): Promise<AdherentSeance_VM[]> {
    return this.api.GET<AdherentSeance_VM[]>(this.base+ `/adherent`);
  }
    prof(): Promise<AdherentSeance_VM[]> {
    return this.api.GET<AdherentSeance_VM[]>(this.base+ `/prof`);
  }

}

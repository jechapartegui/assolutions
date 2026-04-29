import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { ProjetView } from '@shared/lib/compte.interface';
import { Adherent_VM } from '@shared/lib/member.interface';

@Injectable({ providedIn: 'root' })
export class AdhesionApiService {
  private readonly base = '/adhesion';

  constructor(private api: ApiClientService) {}

  get(): Promise<ProjetView[]> {
    return this.api.GET<ProjetView[]>(this.base);
  }
    Anniversaire(saison_id: number): Promise<string[]> {
    return this.api.GET<string[]>(this.base + `/anniversaire/${saison_id}`);
  }

  GetAdherentAdhesion(saison_id: number, login: string): Promise<Adherent_VM[]> {
    return this.api.POST<Adherent_VM[]>(this.base + `/adherent/${saison_id}` , { login });
  }

}

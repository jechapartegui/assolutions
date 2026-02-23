import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { ProjetView } from '@shared/lib/compte.interface';

@Injectable({ providedIn: 'root' })
export class AdhesionApiService {
  private readonly base = '/adhesion';

  constructor(private api: ApiClientService) {}

  get(): Promise<ProjetView[]> {
    return this.api.GET<ProjetView[]>(this.base);
  }

}

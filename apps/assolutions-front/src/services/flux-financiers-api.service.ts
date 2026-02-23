import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import {
  FluxFinancier,
  CreateFluxFinancierDto,
  UpdateFluxFinancierDto,
} from '@shared/lib/flux-financier.interface';

@Injectable({ providedIn: 'root' })
export class FluxFinancierApiService {
  private readonly base = '/flux-financier';

  constructor(private api: ApiClientService) {}

  list(): Promise<FluxFinancier[]> {
    return this.api.GET<FluxFinancier[]>(this.base);
  }

  get(id: number): Promise<FluxFinancier> {
    return this.api.GET<FluxFinancier>(`${this.base}/${id}`);
  }

  create(dto: CreateFluxFinancierDto): Promise<FluxFinancier> {
    return this.api.POST<FluxFinancier>(this.base, dto);
  }

  update(id: number, dto: UpdateFluxFinancierDto): Promise<FluxFinancier> {
    return this.api.POST<FluxFinancier>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}

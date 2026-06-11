import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import {
  Operation,
  CreateOperationDto,
  UpdateOperationDto,
} from '@shared/lib/operation.interface';

@Injectable({ providedIn: 'root' })
export class OperationApiService {
  private readonly base = '/operations';

  constructor(private api: ApiClientService) {}

  list(fluxFinancierId?: number): Promise<Operation[]> {
    const url = fluxFinancierId
      ? `${this.base}?flux_financier_id=${fluxFinancierId}`
      : this.base;

    return this.api.GET<Operation[]>(url);
  }

  get(id: number): Promise<Operation> {
    return this.api.GET<Operation>(`${this.base}/${id}`);
  }

  create(dto: CreateOperationDto): Promise<Operation> {
    return this.api.POST<Operation>(this.base, dto);
  }

  update(id: number, dto: UpdateOperationDto): Promise<Operation> {
    return this.api.POST<Operation>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}
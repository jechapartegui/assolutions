import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Stock, CreateStockDto, UpdateStockDto } from '@shared/lib/stock.interface';

@Injectable({ providedIn: 'root' })
export class StockApiService {
  private readonly base = '/stock';

  constructor(private api: ApiClientService) {}

  list(fluxFinancierId?: number): Promise<Stock[]> {
    const url = fluxFinancierId
      ? `${this.base}?flux_financier_id=${fluxFinancierId}`
      : this.base;

    return this.api.GET<Stock[]>(url);
  }

  get(id: number): Promise<Stock> {
    return this.api.GET<Stock>(`${this.base}/${id}`);
  }

  create(dto: CreateStockDto): Promise<Stock> {
    return this.api.POST<Stock>(this.base, dto);
  }

  update(id: number, dto: UpdateStockDto): Promise<Stock> {
    return this.api.POST<Stock>(`${this.base}/${id}/update`, dto);
  }

  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}

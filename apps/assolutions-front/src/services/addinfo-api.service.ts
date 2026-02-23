import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { AddInfo, CreateAddInfoDto, UpdateAddInfoDto } from '@shared/lib/addinfo.interface';

@Injectable({ providedIn: 'root' })
export class AddInfoApiService {
  private readonly base = '/addinfo';

  constructor(private api: ApiClientService) {}

  list(): Promise<AddInfo[]> {
    return this.api.GET<AddInfo[]>(this.base);
  }

  get(id: number): Promise<AddInfo> {
    return this.api.GET<AddInfo>(`${this.base}/${id}`);
  }

  create(dto: CreateAddInfoDto): Promise<AddInfo> {
    return this.api.POST<AddInfo>(this.base, dto);
  }

  // ✅ UPDATE via POST
  update(id: number, dto: UpdateAddInfoDto): Promise<AddInfo> {
    return this.api.POST<AddInfo>(`${this.base}/${id}/update`, dto);
  }

  // ✅ DELETE via POST
  remove(id: number): Promise<void> {
    return this.api.POST<void>(`${this.base}/${id}/delete`, {});
  }
}

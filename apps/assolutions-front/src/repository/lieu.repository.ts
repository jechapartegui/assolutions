import { Injectable } from '@angular/core';
import { Lieu_VM } from '@shared/lib/lieu.interface';
import { AppStore } from '../app/app.store';
import { LieuApiService } from '../services/lieu-api.service';
import { LieuMapper } from '../mapper/lieu.mapper';

@Injectable({ providedIn: 'root' })
export class LieuRepository {
  constructor(
    private readonly appStore: AppStore,
    private readonly lieuApi: LieuApiService,
    private readonly mapper: LieuMapper,
  ) {}

  async loadLieux(): Promise<Lieu_VM[]> {
    const list = await this.lieuApi.list();
    return (list ?? []).map((x) => this.mapper.toLieuVm(x));
  }

  async loadLieuById(id: number): Promise<Lieu_VM> {
    const item = await this.lieuApi.get(id);
    return this.mapper.toLieuVm(item);
  }

  async createLieu(vm: Lieu_VM): Promise<Lieu_VM> {
    const dto = this.mapper.toCreateDto(vm, this.appStore.selectedProjectId());
    const created = await this.lieuApi.create(dto);
    return this.mapper.toLieuVm(created);
  }

  async updateLieu(vm: Lieu_VM): Promise<Lieu_VM> {
    const dto = this.mapper.toUpdateDto(vm, this.appStore.selectedProjectId());
    const updated = await this.lieuApi.update(vm.id, dto);
    return this.mapper.toLieuVm(updated);
  }

  async deleteLieu(id: number): Promise<void> {
    await this.lieuApi.remove(id);
  }
}
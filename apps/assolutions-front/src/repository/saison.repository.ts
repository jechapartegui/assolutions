import { Injectable } from '@angular/core';
import { SaisonApiService } from '../services/saison-api.service';
import { SaisonMapper } from '../mapper/saison.mapper';
import { Saison_VM } from '../vm/saison-page.vm';

@Injectable({ providedIn: 'root' })
export class SaisonRepository {
  constructor(
    private readonly saisonApi: SaisonApiService,
    private readonly mapper: SaisonMapper,
  ) {}

  async loadSaisons(): Promise<Saison_VM[]> {
    const list = await this.saisonApi.list();
    return this.mapper
      .sortBySaisonPrecedenteOrId((list ?? []).map((x) => this.mapper.toSaisonVm(x)));
  }

  async loadSaisonById(id: number): Promise<Saison_VM> {
    const item = await this.saisonApi.get(id);
    return this.mapper.toSaisonVm(item);
  }

  async createSaison(vm: Saison_VM): Promise<Saison_VM> {
    const created = await this.saisonApi.create(this.mapper.toCreateDto(vm));
    return this.mapper.toSaisonVm(created);
  }

  async updateSaison(vm: Saison_VM): Promise<Saison_VM> {
    const updated = await this.saisonApi.update(vm.id, this.mapper.toUpdateDto(vm));
    return this.mapper.toSaisonVm(updated);
  }

  async deleteSaison(id: number): Promise<void> {
    await this.saisonApi.remove(id);
  }

  async setActiveSaison(id: number, allSaisons: Saison_VM[]): Promise<Saison_VM[]> {
    const currentActive = allSaisons.find((x) => x.active && x.id !== id);

    if (currentActive) {
      await this.saisonApi.update(currentActive.id, this.mapper.toActiveDto(false));
    }

    await this.saisonApi.update(id, this.mapper.toActiveDto(true));

    return this.loadSaisons();
  }
}
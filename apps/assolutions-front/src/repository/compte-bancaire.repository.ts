import { Injectable } from '@angular/core';
import { CompteBancaire_VM } from '@shared/lib/compte-bancaire.interface';
import { CompteBancaireApiService } from '../services/compte-bancaire-api.service';
import { CompteBancaireMapper } from '../mapper/compte-bancaire.mapper';

@Injectable({ providedIn: 'root' })
export class CompteBancaireRepository {
  constructor(
    private readonly api: CompteBancaireApiService,
    private readonly mapper: CompteBancaireMapper,
  ) {}

  async loadComptes(): Promise<CompteBancaire_VM[]> {
    const list = await this.api.list();
    return (list ?? []).map((x) => this.mapper.toVm(x));
  }

  async loadCompteById(id: number): Promise<CompteBancaire_VM> {
    const item = await this.api.get(id);
    return this.mapper.toVm(item);
  }

  async createCompte(vm: CompteBancaire_VM): Promise<CompteBancaire_VM> {
    const created = await this.api.create(this.mapper.toCreateDto(vm));
    return this.mapper.toVm(created);
  }

  async updateCompte(vm: CompteBancaire_VM): Promise<CompteBancaire_VM> {
    const updated = await this.api.update(vm.id, this.mapper.toUpdateDto(vm));
    return this.mapper.toVm(updated);
  }

  async deleteCompte(id: number): Promise<void> {
    await this.api.remove(id);
  }
}
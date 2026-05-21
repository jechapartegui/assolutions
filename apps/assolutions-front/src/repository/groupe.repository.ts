import { Injectable } from '@angular/core';
import { GroupesApiService } from '../services/groupes-api.service';
import { LienGroupeApiService } from '../services/lien-groupe-api.service';
import { AdherentRepository } from './adherent.repository';
import { AdherentListItem_VM } from '../vm/adherent-page.vm';
import { CreateLienGroupeDto, Groupe, LienGroupe_VM } from '@shared/index';

@Injectable({ providedIn: 'root' })
export class GroupeRepository {
  constructor(
    private readonly groupesApi: GroupesApiService,
    private readonly lienGroupeApi: LienGroupeApiService,
    private readonly adherentRepository: AdherentRepository,
  ) {}

  async loadPageData(saisonId: number): Promise<{ groupes: Groupe[]; adherents: AdherentListItem_VM[] }> {
    const [groupes, adherentPage] = await Promise.all([
      this.groupesApi.list(saisonId),
      this.adherentRepository.loadPageData(saisonId),
    ]);

    return {
      groupes: groupes,
      adherents: adherentPage.list ?? [],
    };
  }

  async createGroupe(vm: Groupe, saisonId: number): Promise<Groupe> {
    const created = await this.groupesApi.create({
      nom: vm.nom,
      whatsapp: vm.whatsapp ?? '',
      visible: !!vm.visible,
      saison_id: saisonId,
    } as any);

    return this.toGroupeListItemVm(created, saisonId);
  }

  async updateGroupe(vm: Groupe, saisonId: number): Promise<Groupe> {
    const updated = await this.groupesApi.update(vm.id, {
      nom: vm.nom,
      whatsapp: vm.whatsapp ?? '',
      visible: !!vm.visible,
      saison_id: saisonId,
    } as any);

    return this.toGroupeListItemVm(updated, saisonId);
  }

  async deleteGroupe(groupeId: number, adherents: AdherentListItem_VM[]): Promise<void> {
    const liens = this.getLienIdsForGroupe(groupeId, adherents);

    for (const lienId of liens) {
      await this.lienGroupeApi.remove(lienId);
    }

    await this.groupesApi.remove(groupeId);
  }

  async addAdherentToGroupe(adherentId: number, groupeId: number): Promise<number | null> {
    const lien = await this.lienGroupeApi.create({
      object_id: adherentId,
      personne_id: adherentId,
      object_type: 'rider',
      groupe_id: groupeId,
    } as CreateLienGroupeDto);

    return (lien as any)?.id ?? null;
  }

  async removeAdherentFromGroupe(adherent: AdherentListItem_VM, groupeId: number): Promise<void> {
    await this.lienGroupeApi.removeidfromgroupe(Number(adherent.id), groupeId, 'rider');
  }

  private getLienIdsForGroupe(groupeId: number, adherents: AdherentListItem_VM[]): number[] {
    return (adherents ?? [])
      .map((adherent) => (adherent.groupesActifs ?? []).find((g: LienGroupe_VM) => this.getGroupeId(g) === Number(groupeId)))
      .filter(Boolean)
      .map((g) => this.getLienId(g))
      .filter((id) => id !== null && id !== undefined)
      .map(Number);
  }

  private getGroupeId(groupe: LienGroupe_VM ): number {
    return Number(
      groupe?.id ??
      0,
    );
  }

  private getLienId(groupe: LienGroupe_VM): number | null {
    const id = groupe?.id_lien ;
    return id === null || id === undefined ? null : Number(id);
  }

  private toGroupeListItemVm(raw: any, saisonId: number): Groupe {
    return {
      id: Number(raw.id),
      nom: raw.nom ?? raw.name ?? '',
      whatsapp: raw.whatsapp ?? '',
      project_id: Number(raw.project_id ?? 0),
      visible: !!raw.visible,
      saison_id: Number(raw.saison_id ?? saisonId),
    };
  }
}

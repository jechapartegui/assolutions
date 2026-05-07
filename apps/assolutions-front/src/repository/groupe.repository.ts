import { Injectable } from '@angular/core';
import { GroupesApiService } from '../services/groupes-api.service';
import { LienGroupeApiService } from '../services/lien-groupe-api.service';
import { AdherentRepository } from './adherent.repository';
import { AdherentListItem_VM } from '../vm/adherent-page.vm';
import { GroupeEditVm, GroupeListItem_VM } from '../vm/groupe-page.vm';

@Injectable({ providedIn: 'root' })
export class GroupeRepository {
  constructor(
    private readonly groupesApi: GroupesApiService,
    private readonly lienGroupeApi: LienGroupeApiService,
    private readonly adherentRepository: AdherentRepository,
  ) {}

  async loadPageData(saisonId: number): Promise<{ groupes: GroupeListItem_VM[]; adherents: AdherentListItem_VM[] }> {
    const [groupes, adherentPage] = await Promise.all([
      this.groupesApi.list(saisonId),
      this.adherentRepository.loadPageData(saisonId),
    ]);

    return {
      groupes: (groupes ?? []).map((g: any) => this.toGroupeListItemVm(g, saisonId)),
      adherents: (adherentPage.list ?? []).filter((a) => !!a.inscrit),
    };
  }

  async createGroupe(vm: GroupeEditVm, saisonId: number): Promise<GroupeListItem_VM> {
    const created = await this.groupesApi.create({
      nom: vm.nom,
      whatsapp: vm.whatsapp ?? '',
      prive: !!vm.prive,
      saison_id: saisonId,
    } as any);

    return this.toGroupeListItemVm(created, saisonId);
  }

  async updateGroupe(vm: GroupeEditVm, saisonId: number): Promise<GroupeListItem_VM> {
    const updated = await this.groupesApi.update(vm.id, {
      nom: vm.nom,
      whatsapp: vm.whatsapp ?? '',
      prive: !!vm.prive,
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
      type: 'rider',
      groupe_id: groupeId,
    } as any);

    return (lien as any)?.id ?? null;
  }

  async removeAdherentFromGroupe(adherent: AdherentListItem_VM, groupeId: number): Promise<void> {
    const lien = (adherent.groupesActifs ?? []).find((g: any) => Number(g.id) === Number(groupeId));
    const lienId = (lien as any)?.id_lien ?? (lien as any)?.lien_id ?? (lien as any)?.idLien;

    if (!lienId) {
      throw new Error('Lien groupe introuvable pour cet adhérent');
    }

    await this.lienGroupeApi.remove(Number(lienId));
  }

  private getLienIdsForGroupe(groupeId: number, adherents: AdherentListItem_VM[]): number[] {
    return (adherents ?? [])
      .map((adherent) => (adherent.groupesActifs ?? []).find((g: any) => Number(g.id) === Number(groupeId)) as any)
      .filter(Boolean)
      .map((g) => g.id_lien ?? g.lien_id ?? g.idLien)
      .filter((id) => id !== null && id !== undefined)
      .map(Number);
  }

  private toGroupeListItemVm(raw: any, saisonId: number): GroupeListItem_VM {
    return {
      id: Number(raw.id),
      nom: raw.nom ?? raw.name ?? '',
      whatsapp: raw.whatsapp ?? '',
      prive: !!raw.prive,
      saison_id: Number(raw.saison_id ?? saisonId),
    };
  }
}

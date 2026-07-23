import { Injectable } from '@angular/core';
import { GroupesApiService } from '../services/groupes-api.service';
import { LienGroupeApiService } from '../services/lien-groupe-api.service';
import { AdherentListItem_VM } from '../vm/adherent-page.vm';
import { CreateLienGroupeDto, Groupe, LienGroupe_VM } from '@shared/index';

@Injectable({ providedIn: 'root' })
export class GroupeRepository {
  constructor(
    private readonly groupesApi: GroupesApiService,
    private readonly lienGroupeApi: LienGroupeApiService,
  ) {}

  async loadGroupes(saisonId: number): Promise<Groupe[]> {
    const groupes = await this.groupesApi.list(Number(saisonId));
    return (groupes ?? []).map((g) => this.toGroupeListItemVm(g, Number(saisonId)));
  }

  async loadGroupeById(id: number, saisonId = 0): Promise<Groupe> {
    const groupe = await this.groupesApi.get(Number(id));
    return this.toGroupeListItemVm(groupe, Number(saisonId) || Number((groupe as any)?.saison_id ?? 0));
  }

  async createGroupe(vm: Groupe, saisonId: number): Promise<Groupe> {
    const created = await this.groupesApi.create({
      nom: vm.nom,
      whatsapp: vm.whatsapp ?? '',
      visible: !!vm.visible,
      saison_id: Number(saisonId),
    } as any);

    return this.toGroupeListItemVm(created, Number(saisonId));
  }

  async updateGroupe(vm: Groupe, saisonId: number): Promise<Groupe> {
    const updated = await this.groupesApi.update(Number(vm.id), {
      nom: vm.nom,
      whatsapp: vm.whatsapp ?? '',
      visible: !!vm.visible,
      saison_id: Number(saisonId),
    } as any);

    return this.toGroupeListItemVm(updated, Number(saisonId));
  }

  async deleteGroupeOnly(groupeId: number): Promise<void> {
    await this.groupesApi.remove(Number(groupeId));
  }

  async deleteGroupe(groupeId: number, adherents: AdherentListItem_VM[]): Promise<void> {
    const liens = this.getLienIdsForGroupe(Number(groupeId), adherents);

    for (const lienId of liens) {
      await this.lienGroupeApi.remove(lienId);
    }

    await this.groupesApi.remove(Number(groupeId));
  }

  async addAdherentToGroupe(adherentId: number, groupeId: number): Promise<number | null> {
    const lien = await this.lienGroupeApi.create({
      object_id: Number(adherentId),
      personne_id: Number(adherentId),
      object_type: 'rider',
      groupe_id: Number(groupeId),
    } as CreateLienGroupeDto);

    return (lien as any)?.id ?? null;
  }

  async removeAdherentFromGroupe(adherent: AdherentListItem_VM, groupeId: number): Promise<void> {
    await this.lienGroupeApi.removeidfromgroupe(Number(adherent.id), Number(groupeId), 'rider');
  }

  private getLienIdsForGroupe(groupeId: number, adherents: AdherentListItem_VM[]): number[] {
    return (adherents ?? [])
      .map((adherent) =>
        (adherent.groupesActifs ?? []).find((g: LienGroupe_VM) => this.getGroupeId(g) === Number(groupeId)),
      )
      .filter(Boolean)
      .map((g) => this.getLienId(g as LienGroupe_VM))
      .filter((id) => id !== null && id !== undefined)
      .map(Number);
  }

  private getGroupeId(groupe: LienGroupe_VM): number {
    return Number(
      (groupe as any)?.groupe_id ??
      groupe?.id ??
      0,
    );
  }

  private getLienId(groupe: LienGroupe_VM): number | null {
    const id = groupe?.id_lien;
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

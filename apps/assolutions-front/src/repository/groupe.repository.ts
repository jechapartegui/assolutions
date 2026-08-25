import { Injectable } from '@angular/core';
import {
  CreateGroupeDto,
  CreateLienGroupeDto,
  Groupe,
  LienGroupe_VM,
  UpdateGroupeDto,
} from '@shared/index';

import { GroupesApiService } from '../services/groupes-api.service';
import { LienGroupeApiService } from '../services/lien-groupe-api.service';
import { AdherentListItem_VM } from '../vm/adherent-page.vm';

@Injectable({ providedIn: 'root' })
export class GroupeRepository {
  constructor(
    private readonly groupesApi: GroupesApiService,
    private readonly lienGroupeApi: LienGroupeApiService,
  ) {}

  async loadGroupes(saisonId: number): Promise<Groupe[]> {
    const normalizedSaisonId = Number(saisonId);
    const groupes = await this.groupesApi.list(normalizedSaisonId);

    return (groupes ?? []).map((groupe) =>
      this.toGroupe(groupe, normalizedSaisonId),
    );
  }

  async loadGroupeById(id: number, saisonId = 0): Promise<Groupe> {
    const groupe = await this.groupesApi.get(Number(id));
    const normalizedSaisonId =
      Number(saisonId) || Number(groupe?.saison_id ?? 0);

    return this.toGroupe(groupe, normalizedSaisonId);
  }

  async createGroupe(vm: Groupe, saisonId: number): Promise<Groupe> {
    const normalizedSaisonId = Number(saisonId);
    const dto: CreateGroupeDto = {
      nom: (vm.nom ?? '').trim(),
      saison_id: normalizedSaisonId,
      whatsapp: this.normalizeOptionalString(vm.whatsapp),
      visible: !!vm.visible,
      age_min: this.normalizeOptionalInteger(vm.age_min),
      age_max: this.normalizeOptionalInteger(vm.age_max),
      naissance_avant: this.normalizeOptionalInteger(vm.naissance_avant),
      naissance_apres: this.normalizeOptionalInteger(vm.naissance_apres),
      limit_nb: this.normalizeOptionalInteger(vm.limit_nb),
    };

    const created = await this.groupesApi.create(dto);
    return this.toGroupe(created, normalizedSaisonId);
  }

  async updateGroupe(vm: Groupe, saisonId: number): Promise<Groupe> {
    const normalizedSaisonId = Number(saisonId);
    const dto: UpdateGroupeDto = {
      nom: (vm.nom ?? '').trim(),
      saison_id: normalizedSaisonId,
      whatsapp: this.normalizeOptionalString(vm.whatsapp),
      visible: !!vm.visible,
      age_min: this.normalizeOptionalInteger(vm.age_min),
      age_max: this.normalizeOptionalInteger(vm.age_max),
      naissance_avant: this.normalizeOptionalInteger(vm.naissance_avant),
      naissance_apres: this.normalizeOptionalInteger(vm.naissance_apres),
      limit_nb: this.normalizeOptionalInteger(vm.limit_nb),
    };

    const updated = await this.groupesApi.update(Number(vm.id), dto);
    return this.toGroupe(updated, normalizedSaisonId);
  }

  async deleteGroupeOnly(groupeId: number): Promise<void> {
    await this.groupesApi.remove(Number(groupeId));
  }

  async deleteGroupe(
    groupeId: number,
    adherents: AdherentListItem_VM[],
  ): Promise<void> {
    const liens = this.getLienIdsForGroupe(Number(groupeId), adherents);

    for (const lienId of liens) {
      await this.lienGroupeApi.remove(lienId);
    }

    await this.groupesApi.remove(Number(groupeId));
  }

  async addAdherentToGroupe(
    adherentId: number,
    groupeId: number,
  ): Promise<number | null> {
    const lien = await this.lienGroupeApi.create({
      object_id: Number(adherentId),
      object_type: 'rider',
      groupe_id: Number(groupeId),
    } as CreateLienGroupeDto);

    return (lien as { id?: number } | null)?.id ?? null;
  }

  async removeAdherentFromGroupe(
    adherent: AdherentListItem_VM,
    groupeId: number,
  ): Promise<void> {
    await this.lienGroupeApi.removeidfromgroupe(
      Number(adherent.id),
      Number(groupeId),
      'rider',
    );
  }

  private getLienIdsForGroupe(
    groupeId: number,
    adherents: AdherentListItem_VM[],
  ): number[] {
    return (adherents ?? [])
      .map((adherent) =>
        (adherent.groupesActifs ?? []).find(
          (groupe: LienGroupe_VM) =>
            this.getGroupeId(groupe) === Number(groupeId),
        ),
      )
      .filter(Boolean)
      .map((groupe) => this.getLienId(groupe as LienGroupe_VM))
      .filter((id): id is number => id !== null)
      .map(Number);
  }

  private getGroupeId(groupe: LienGroupe_VM): number {
    return Number(
      (groupe as LienGroupe_VM & { groupe_id?: number })?.groupe_id ??
        groupe?.id ??
        0,
    );
  }

  private getLienId(groupe: LienGroupe_VM): number | null {
    const id = groupe?.id_lien;
    return id === null || id === undefined ? null : Number(id);
  }

  private toGroupe(
    raw: Groupe | Record<string, unknown>,
    saisonId: number,
  ): Groupe {
    const source = raw as Groupe & { name?: string };

    return {
      id: Number(source.id),
      project_id: Number(source.project_id ?? 0),
      nom: source.nom ?? source.name ?? '',
      saison_id: Number(source.saison_id ?? saisonId),
      whatsapp: this.normalizeOptionalString(source.whatsapp),
      visible: !!source.visible,
      age_min: this.normalizeOptionalInteger(source.age_min),
      age_max: this.normalizeOptionalInteger(source.age_max),
      naissance_avant: this.normalizeOptionalInteger(source.naissance_avant),
      naissance_apres: this.normalizeOptionalInteger(source.naissance_apres),
      limit_nb: this.normalizeOptionalInteger(source.limit_nb),
    };
  }

  private normalizeOptionalString(
    value: string | null | undefined,
  ): string | null {
    const normalized = (value ?? '').trim();
    return normalized || null;
  }

  private normalizeOptionalInteger(
    value: number | string | null | undefined,
  ): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : null;
  }
}

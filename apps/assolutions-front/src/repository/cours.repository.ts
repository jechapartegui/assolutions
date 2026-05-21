import { Injectable } from '@angular/core';
import {
  Cours,
  Cours_VM,
  KeyValuePair,
  mapCoursListToVM,
  mapCoursToVM,
  ProfLight_VM,
} from '@shared/index';

import { AppStore } from '../app/app.store';
import { RefDataRepository } from './refdata.repository';
import { CoursMapper } from '../mapper/cours.mapper';
import { CoursPageData } from '../vm/cours-page.vm';

import { SaisonApiService } from '../services/saison-api.service';
import { CoursApiService } from '../services/cours-api.service';
import { CoursProfesseurApiService } from '../services/cours-professeur-api.service';
import { LienGroupeApiService } from '../services/lien-groupe-api.service';

@Injectable({ providedIn: 'root' })
export class CoursRepository {
  constructor(
    private readonly appStore: AppStore,
    private readonly refDataRepository: RefDataRepository,
    private readonly saisonService: SaisonApiService,
    private readonly CoursApiService: CoursApiService,
    private readonly coursProfesseurService: CoursProfesseurApiService,
    private readonly lienGroupeService: LienGroupeApiService,
    private readonly mapper: CoursMapper,
  ) {}

  async loadPageData(saisonId: number): Promise<CoursPageData> {
    const storedProjectId = this.appStore.selectedProjectId();

    const [saisons, profs, lieux, groupes, list] = await Promise.all([
      this.saisonService.list(),
      this.refDataRepository.getProfs(storedProjectId, saisonId),
      this.refDataRepository.getLieux(storedProjectId),
      this.refDataRepository.getGroupes(saisonId),
      this.loadCours(saisonId),
    ]);

    const activeSaison =
      (saisons ?? []).find((x) => x.id === saisonId) ??
      (saisons ?? []).find((x) => x.active === true) ??
      (saisons ?? [])[0] ??
      null;

    const listeProfFilter: KeyValuePair[] = (profs ?? []).map((x: ProfLight_VM) => ({
      key:  x.id ?? 0,
      value: `${x.prenom ?? ''} ${x.nom ?? ''}`.trim(),
    }));

    const listeLieuFilter: KeyValuePair[] = (lieux ?? []).map((x: any) => ({
      key: x.id ?? 0,
      value: x.nom ?? '',
    }));

    const refs = this.mapper.buildReferencesVm(
      list,
      groupes ?? [],
      listeLieuFilter,
      listeProfFilter,
      saisons ?? [],
    );

    return this.mapper.buildPageData(refs, list, activeSaison);
  }

  async loadCours(saisonId: number): Promise<Cours_VM[]> {
    const storedProjectId = this.appStore.selectedProjectId();

    const [coursList, lieux, groupes, profs] = await Promise.all([
      this.CoursApiService.list(saisonId),
      this.refDataRepository.getLieux(storedProjectId),
      this.refDataRepository.getGroupes(saisonId),
      this.refDataRepository.getProfs(storedProjectId, saisonId),
    ]);

    const coursIds = (coursList ?? [])
      .map((x) => x.id)
      .filter((id): id is number => !!id);
const contratsByCoursId: Record<number, number[]> =
  coursIds.length > 0
    ? await this.coursProfesseurService.listProfsByCoursId(coursIds)
    : {};

const groupesByCoursId: Record<number, number[]> =
  coursIds.length > 0
    ? await this.lienGroupeService.listGroupesByCoursId(coursIds)
    : {};
    

    return mapCoursListToVM(
      coursList ?? [],
      (lieux ?? []) as any,
      (groupes ?? []) as any,
      (profs ?? []) as any,
      {
        groupesByCoursId: (groupesByCoursId ?? {}) as Record<number, number[]>,
        contratsByCoursId,
      },
    );
  }

  async loadCoursById(coursId: number, saisonId: number): Promise<Cours_VM> {
  const storedProjectId = this.appStore.selectedProjectId();

  const [cours, lieux, groupes, profs, contratsByCoursId, groupesByCoursId] = await Promise.all([
    this.CoursApiService.get(coursId),
    this.refDataRepository.getLieux(storedProjectId),
    this.refDataRepository.getGroupes(saisonId),
    this.refDataRepository.getProfs(storedProjectId, saisonId),
    this.coursProfesseurService.listProfsByCoursId([coursId]),
    this.lienGroupeService.listGroupesByCoursId([coursId]),
  ]);

  return mapCoursToVM(
    cours,
    (lieux ?? []) as any,
    (groupes ?? []) as any,
    (profs ?? []) as any,
    {
      groupesByCoursId,
      contratsByCoursId,
    },
  );
}

  async createCours(coursVm: Cours_VM): Promise<Cours_VM> {
    const projectId = this.appStore.selectedProjectId();
    const dto = this.mapper.toCreateDto(coursVm, projectId);
    const created = await this.CoursApiService.create(dto);
    return this.mapper.toCoursVm(created);
  }

  async updateCours(coursVm: Cours_VM): Promise<Cours_VM> {
    const projectId = this.appStore.selectedProjectId();
    const dto = this.mapper.toUpdateDto(coursVm, projectId);
    const updated = await this.CoursApiService.update(coursVm.id, dto);
    return this.mapper.toCoursVm(updated);
  }

  async deleteCours(coursId: number): Promise<void> {
    await this.coursProfesseurService.updatelist(coursId, [], this.appStore.saison_active_id());
    await this.lienGroupeService.updateGroupesForCours(coursId, []);
    await this.CoursApiService.remove(coursId);
  }

async updateSerieCours(coursVm: Cours_VM, fromDate: Date): Promise<void> {
  if (!coursVm?.id) {
    throw new Error($localize`Impossible de modifier la série d'un cours sans identifiant`);
  }

  const projectId = this.appStore.selectedProjectId();
  const dto = this.mapper.toUpdateDto(coursVm, projectId);
  await this.CoursApiService.updateSerieCours(coursVm.id, dto, fromDate);
}
  async updateCoursProfs(coursId: number, profs: any[]): Promise<void> {
    const contratIds = (profs ?? [])
      .map((p: any) => p.contrat_id ?? p.id ?? 0)
      .filter((id: number) => id > 0);

    await this.coursProfesseurService.updatelist(coursId, contratIds, this.appStore.saison_active_id());
  }

  async updateCoursGroupes(coursId: number, groupeIds: number[]): Promise<void> {
    await this.lienGroupeService.updateGroupesForCours(
      coursId,
      (groupeIds ?? []).filter((id) => id > 0),
    );
  }
}
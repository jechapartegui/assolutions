import { Injectable } from '@angular/core';
import {
  Cours_VM,
  KeyValuePair,
  mapCoursListToVM,
  mapCoursToVM,
  ProfLight_VM,
} from '@shared/index';

import { AppStore } from '../app/app.store';
import { CoursMapper } from '../mapper/cours.mapper';
import { CoursPageData } from '../vm/cours-page.vm';

import { SaisonApiService } from '../services/saison-api.service';
import { CoursApiService } from '../services/cours-api.service';
import { LienGroupeApiService } from '../services/lien-groupe-api.service';

import { LieuDataStore } from '../data-store/lieu-data.store';
import { GroupeDataStore } from '../data-store/groupe-data.store';
import { ContratProfDataStore } from '../data-store/contrat-prof-data.store';
import { CoursProfesseurDataStore } from '../data-store/cours-professeur-data.store';

@Injectable({ providedIn: 'root' })
export class CoursRepository {
  constructor(
    private readonly appStore: AppStore,
    private readonly saisonService: SaisonApiService,
    private readonly coursApiService: CoursApiService,
    private readonly coursProfesseurDataStore: CoursProfesseurDataStore,
    private readonly lienGroupeService: LienGroupeApiService,
    private readonly lieuDataStore: LieuDataStore,
    private readonly groupeDataStore: GroupeDataStore,
    private readonly contratProfDataStore: ContratProfDataStore,
    private readonly mapper: CoursMapper,
  ) {}

  async loadPageData(saisonId: number, options: { force?: boolean } = {}): Promise<CoursPageData> {
    const [saisons, profs, lieux, groupes, list] = await Promise.all([
      this.saisonService.list(),
      this.contratProfDataStore.loadProfLightsBySaison(saisonId, options),
      this.lieuDataStore.loadAll(options),
      this.groupeDataStore.loadBySaison(saisonId, options),
      this.loadCours(saisonId, options),
    ]);

    const activeSaison =
      (saisons ?? []).find((x) => x.id === saisonId) ??
      (saisons ?? []).find((x) => x.active === true) ??
      (saisons ?? [])[0] ??
      null;

    const listeProfFilter = this.toProfFilter(profs ?? []);
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

  async loadCours(saisonId: number, options: { force?: boolean } = {}): Promise<Cours_VM[]> {
    const [coursList, lieux, groupes, profs] = await Promise.all([
      this.coursApiService.list(saisonId),
      this.lieuDataStore.loadAll(options),
      this.groupeDataStore.loadBySaison(saisonId, options),
      this.contratProfDataStore.loadProfLightsBySaison(saisonId, options),
    ]);

    const coursIds = (coursList ?? [])
      .map((x) => x.id)
      .filter((id): id is number => !!id);

    const [contratsByCoursId, groupesByCoursId] = await Promise.all([
      coursIds.length
        ? this.coursProfesseurDataStore.loadByCoursIds(coursIds, options)
        : Promise.resolve({} as Record<number, number[]>),
      coursIds.length
        ? this.lienGroupeService.listGroupesByCoursId(coursIds)
        : Promise.resolve({} as Record<number, number[]>),
    ]);

    return mapCoursListToVM(
      coursList ?? [],
      (lieux ?? []) as any,
      (groupes ?? []) as any,
      (profs ?? []) as any,
      {
        groupesByCoursId: (groupesByCoursId ?? {}) as Record<number, number[]>,
        contratsByCoursId: (contratsByCoursId ?? {}) as Record<number, number[]>,
      },
    );
  }

  async loadCoursById(coursId: number, saisonId: number, options: { force?: boolean } = {}): Promise<Cours_VM> {
    const [cours, lieux, groupes, profs, contratsByCoursId, groupesByCoursId] = await Promise.all([
      this.coursApiService.get(coursId),
      this.lieuDataStore.loadAll(options),
      this.groupeDataStore.loadBySaison(saisonId, options),
      this.contratProfDataStore.loadProfLightsBySaison(saisonId, options),
      this.coursProfesseurDataStore.loadByCoursIds([coursId], options),
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
    const professeurs = [...(coursVm.professeursCours ?? [])];
    const groupeIds = [...new Set(
      (coursVm.groupes ?? [])
        .map((g: any) => Number(g?.groupe_id ?? g?.id ?? 0))
        .filter((id: number) => Number.isFinite(id) && id > 0),
    )];

    const dto = this.mapper.toCreateDto(coursVm, projectId);
    const created = this.mapper.toCoursVm(await this.coursApiService.create(dto));

    if (!created.id || created.id <= 0) {
      throw new Error('Le cours a été créé sans identifiant');
    }

    await this.updateCoursProfs(
      created.id,
      professeurs as Array<ProfLight_VM | any>,
      Number(coursVm.saison_id),
    );
    await this.updateCoursGroupes(created.id, groupeIds);

    return created;
  }

  async updateCours(coursVm: Cours_VM): Promise<Cours_VM> {
    const projectId = this.appStore.selectedProjectId();
    const dto = this.mapper.toUpdateDto(coursVm, projectId);
    const updated = await this.coursApiService.update(coursVm.id, dto);
    return this.mapper.toCoursVm(updated);
  }

  async deleteCours(coursId: number, saisonId = this.appStore.saison_active_id()): Promise<void> {
    await this.coursProfesseurDataStore.updateList(coursId, [], saisonId);
    await this.lienGroupeService.updateGroupesForCours(coursId, []);
    await this.coursApiService.remove(coursId);
  }

  async updateSerieCours(coursVm: Cours_VM, fromDate: Date): Promise<void> {
    if (!coursVm?.id) {
      throw new Error($localize`Impossible de modifier la série d'un cours sans identifiant`);
    }

    const projectId = this.appStore.selectedProjectId();
    const dto = this.mapper.toUpdateDto(coursVm, projectId);
    const professeurContratIds = this.cleanIds(
      (coursVm.professeursCours ?? []).map(
        (prof: any) => prof?.contrat_id ?? prof?.contratId ?? prof?.id ?? 0,
      ),
    );
    const groupeIds = this.cleanIds(
      (coursVm.groupes ?? []).map(
        (groupe: any) => groupe?.groupe_id ?? groupe?.id ?? 0,
      ),
    );

    // Un seul appel : le back persiste le cours, ses liaisons et les séances
    // futures dans une transaction unique. On évite ainsi les écarts entre
    // cours_professeur/lien_groupe et les séances propagées.
    await this.coursApiService.updateSerieCours(
      coursVm.id,
      {
        ...dto,
        professeur_contrat_ids: professeurContratIds,
        groupe_ids: groupeIds,
      },
      fromDate,
    );

    // La modification atomique se fait directement au back : ce store relationnel
    // doit donc être rechargé au prochain accès au lieu de servir son ancien cache.
    this.coursProfesseurDataStore.invalidateCours(coursVm.id);
  }

  async updateCoursProfs(
    coursId: number,
    profs: Array<ProfLight_VM | any>,
    saisonId = this.appStore.saison_active_id(),
  ): Promise<void> {
    const contratIds = (profs ?? [])
      .map((p: any) => p.contrat_id ?? p.contratId ?? p.id ?? 0)
      .map((id: number) => Number(id))
      .filter((id: number) => Number.isFinite(id) && id > 0);

    await this.coursProfesseurDataStore.updateList(coursId, contratIds, saisonId);
  }

  async updateCoursGroupes(coursId: number, groupeIds: number[]): Promise<void> {
    await this.lienGroupeService.updateGroupesForCours(
      coursId,
      (groupeIds ?? []).filter((id) => id > 0),
    );
  }

  private toProfFilter(profs: ProfLight_VM[]): KeyValuePair[] {
    return (profs ?? []).map((x: ProfLight_VM) => ({
      key: x.contrat_id ?? x.id ?? 0,
      value: `${x.prenom ?? ''} ${x.nom ?? ''}`.trim(),
    }));
  }

  private cleanIds(values: Array<number | string | null | undefined>): number[] {
    return Array.from(
      new Set(
        (values ?? [])
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    );
  }
}

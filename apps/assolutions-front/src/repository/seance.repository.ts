import { Injectable } from '@angular/core';
import {
  KeyValuePair,
  Seance,
  Seance_VM,
  mapSeanceToVM,
  mapSeanceListToVM,
  ProfLight_VM,
} from '@shared/index';

import { SaisonApiService } from '../services/saison-api.service';
import { SeanceApiService } from '../services/seance-api.service';
import { SeanceProfesseurApiService } from '../services/seance-professeur-api.service';
import { SeanceMapper } from '../mapper/seance.mapper';
import { SeancePageData } from '../vm/seance-page.vm';
import { LienGroupeApiService } from '../services/lien-groupe-api.service';

import { LieuDataStore } from '../data-store/lieu-data.store';
import { CoursDataStore } from '../data-store/cours-data.store';
import { GroupeDataStore } from '../data-store/groupe-data.store';
import { ContratProfDataStore } from '../data-store/contrat-prof-data.store';

@Injectable({ providedIn: 'root' })
export class SeanceRepository {
  constructor(
    private readonly saisonServ: SaisonApiService,
    private readonly seancesService: SeanceApiService,
    private readonly lienGroupeApi: LienGroupeApiService,
    private readonly spService: SeanceProfesseurApiService,
    private readonly lieuDataStore: LieuDataStore,
    private readonly coursDataStore: CoursDataStore,
    private readonly groupeDataStore: GroupeDataStore,
    private readonly contratProfDataStore: ContratProfDataStore,
    private readonly mapper: SeanceMapper,
  ) {}

  /**
   * Compatibilité avec l'ancien SeanceStore.
   * La version cible est que le SeanceStore compose lui-même les refs,
   * mais on garde cette méthode pour éviter de casser un autre appel existant.
   */
  async loadPageData(saisonId: number, options: { force?: boolean } = {}): Promise<SeancePageData> {
    const [saisons, listeprof, listelieu, listegroupe, listeCours, list] = await Promise.all([
      this.saisonServ.list(),
      this.contratProfDataStore.loadProfLightsBySaison(saisonId, options),
      this.lieuDataStore.loadAll(options),
      this.groupeDataStore.loadBySaison(saisonId, options),
      this.coursDataStore.loadBySaison(saisonId, options),
      this.loadSeances(saisonId, options),
    ]);

    const activeSaison =
      saisons.find((x) => x.id === saisonId) ??
      saisons.find((x) => x.active === true) ??
      saisons[0] ??
      null;

    const refs = this.mapper.buildReferencesVm(
      listeCours,
      listegroupe,
      this.toLieuFilter(listelieu),
      this.toProfFilter(listeprof),
      saisons,
    );

    return this.mapper.buildPageData(refs, list, activeSaison);
  }

  async loadSeances(saisonId: number, options: { force?: boolean } = {}): Promise<Seance_VM[]> {
    const [seances, listelieu, listeCours, listeprof, listegroupe] = await Promise.all([
      this.seancesService.list(saisonId),
      this.lieuDataStore.loadAll(options),
      this.coursDataStore.loadBySaison(saisonId, options),
      this.contratProfDataStore.loadProfLightsBySaison(saisonId, options),
      this.groupeDataStore.loadBySaison(saisonId, options),
    ]);

    const lieuxById = new Map((listelieu ?? []).map((x: any) => [Number(x.id), x]));
    const coursById = new Map((listeCours ?? []).map((x: any) => [Number(x.id), x]));
    const profsByContratId = this.buildProfsByContratId(listeprof ?? []);
    const groupesById = new Map((listegroupe ?? []).map((g: any) => [Number(g.id), g]));

    const seanceIds = (seances ?? [])
      .map((x: Seance) => Number(x.seance_id ?? x.id))
      .filter((x: number) => Number.isFinite(x) && x > 0);

    const [profLinks, groupesBySeanceId] = await Promise.all([
      seanceIds.length ? this.spService.get_list_by_idseance(seanceIds) : [],
      seanceIds.length ? this.lienGroupeApi.listGroupesBySeanceId(seanceIds) : {},
    ]);

    const contratsBySeanceId = this.buildContratsBySeanceId(profLinks ?? []);

    const list = mapSeanceListToVM(seances ?? [], {
      lieuxById,
      coursById,
      profsByContratId,
      contratsBySeanceId,
    });

    return list.map((seanceVm) => {
      const groupeIds = (groupesBySeanceId as Record<number, number[]>)[seanceVm.id] ?? [];
      const groupes = groupeIds
        .map((id) => groupesById.get(Number(id)))
        .filter((g): g is NonNullable<typeof g> => !!g);

      return {
        ...seanceVm,
        groupes,
      };
    });
  }

  async loadSeance(
    id: number,
    saisonId: number,
    options: { force?: boolean } = {},
  ): Promise<Seance_VM> {
    const [raw, listelieu, listeCours, listeprof, listegroupe, profLinks, groupesBySeanceId] =
      await Promise.all([
        this.seancesService.get(id),
        this.lieuDataStore.loadAll(options),
        this.coursDataStore.loadBySaison(saisonId, options),
        this.contratProfDataStore.loadProfLightsBySaison(saisonId, options),
        this.groupeDataStore.loadBySaison(saisonId, options),
        this.spService.get_list_by_idseance([id]),
        this.lienGroupeApi.listGroupesBySeanceId([id]),
      ]);

    const lieuxById = new Map((listelieu ?? []).map((x: any) => [Number(x.id), x]));
    const coursById = new Map((listeCours ?? []).map((x: any) => [Number(x.id), x]));
    const profsByContratId = this.buildProfsByContratId(listeprof ?? []);
    const groupesById = new Map((listegroupe ?? []).map((g: any) => [Number(g.id), g]));
    const contratsBySeanceId = this.buildContratsBySeanceId(profLinks ?? []);

    const seanceVm = mapSeanceToVM(raw, {
      lieuxById,
      coursById,
      profsByContratId,
      contratsBySeanceId,
    });

    const groupeIds = (groupesBySeanceId as Record<number, number[]>)[seanceVm.id] ?? [];
    const groupes = groupeIds
      .map((gid) => groupesById.get(Number(gid)))
      .filter((g): g is NonNullable<typeof g> => !!g);

    return {
      ...seanceVm,
      groupes,
    };
  }

  async createSeance(seanceVm: Seance_VM): Promise<Seance_VM> {
    const dto = this.mapper.toSeance(seanceVm);
    const created = await this.seancesService.create(dto);
    return this.mapper.toSeanceVm(created);
  }

  async updateSeance(seanceVm: Seance_VM): Promise<Seance> {
    const dto = this.mapper.toUpdateSeanceDto(seanceVm);
    return this.seancesService.update(seanceVm.id, dto);
  }

  async createSerie(
    seanceVm: Seance_VM,
    dateDebut: Date,
    dateFin: Date,
    jourSemaine: string,
  ): Promise<number[]> {
    const dto = this.mapper.toSeance(seanceVm);
    return this.seancesService.addrange(dto, dateDebut, dateFin, jourSemaine);
  }

  async deleteSeance(seanceId: number): Promise<void> {
    await this.seancesService.remove(seanceId);
    await this.spService.updatelist(seanceId, []);
  }

  async updateSeanceProfs(seanceId: number, profs: Array<ProfLight_VM | any>): Promise<void> {
    const contratIds = this.cleanIds(
      (profs ?? []).map((p) => this.contratIdFromSelectedProf(p)),
    );

    await this.spService.updatelist(seanceId, contratIds);
  }

  async updateSeanceGroupes(seanceId: number, groupeIds: number[]): Promise<void> {
    await this.lienGroupeApi.updateGroupesForSeance(seanceId, this.cleanIds(groupeIds));
  }

  private toLieuFilter(lieux: any[]): KeyValuePair[] {
    return (lieux ?? []).map((x: any) => ({
      key: Number(x.id ?? x.lieu_id ?? 0),
      value: x.nom ?? x.label ?? '',
    }));
  }

  private toProfFilter(profs: ProfLight_VM[]): KeyValuePair[] {
    return (profs ?? [])
      .map((x: any) => ({
        // Important : key = id du contrat professeur, pas id personne.
        key: Number(x.contrat_id ?? x.contratId ?? 0),
        value: `${x.prenom ?? ''} ${x.nom ?? ''}`.trim(),
      }))
      .filter((x) => x.key > 0);
  }

  private buildProfsByContratId(profs: ProfLight_VM[]): Map<number, ProfLight_VM> {
    const map = new Map<number, ProfLight_VM>();

    for (const prof of profs ?? []) {
      const contratId = Number((prof as any).contrat_id ?? (prof as any).contratId ?? 0);
      if (!Number.isFinite(contratId) || contratId <= 0) continue;

      map.set(contratId, {
        ...prof,
        contrat_id: contratId,
      } as ProfLight_VM);
    }

    return map;
  }

  private buildContratsBySeanceId(rows: any[]): Map<number, number[]> {
    const contratsBySeanceId = new Map<number, number[]>();

    for (const row of rows ?? []) {
      const seanceId = Number(row.seance_id ?? row.seanceId ?? row.id_seance ?? 0);
      const contratId = Number(
        row.professeurcontract_id ??
          row.professeurContractId ??
          row.contrat_id ??
          row.contratId ??
          row.professeur_contract_id ??
          0,
      );

      if (!Number.isFinite(seanceId) || seanceId <= 0) continue;
      if (!Number.isFinite(contratId) || contratId <= 0) continue;

      const current = contratsBySeanceId.get(seanceId) ?? [];
      current.push(contratId);
      contratsBySeanceId.set(seanceId, current);
    }

    return contratsBySeanceId;
  }

  private contratIdFromSelectedProf(prof: ProfLight_VM | any): number {
    const explicit = Number(
      prof?.contrat_id ??
        prof?.contratId ??
        prof?.professeurcontract_id ??
        prof?.professeurContractId ??
        prof?.key ??
        0,
    );

    if (Number.isFinite(explicit) && explicit > 0) {
      return explicit;
    }

    const id = Number(prof?.id ?? 0);
    if (!Number.isFinite(id) || id <= 0) {
      return 0;
    }

    /**
     * Cas legacy fréquent :
     * un composant transforme un KeyValuePair { key: contratId } en objet { id: contratId }.
     */
    if (this.contratProfDataStore.byId(id)) {
      return id;
    }

    /**
     * Cas propre :
     * ProfLight_VM.id = personneId, et contrat_id existe normalement.
     * Si l'objet a perdu contrat_id, on tente de retrouver le contrat dans le store courant.
     */
    const byPersonneId = this.contratProfDataStore
      .profLights()
      .find((p: any) => Number(p.id) === id);

    return Number((byPersonneId as any)?.contrat_id ?? 0);
  }

  private cleanIds(ids: number[]): number[] {
    return [
      ...new Set(
        (ids ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];
  }
}

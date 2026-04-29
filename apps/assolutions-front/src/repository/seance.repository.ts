import { Injectable } from '@angular/core';
import {
  KeyValuePair,
  Saison,
  Seance,
  Seance_VM,
  mapSeanceToVM,
  mapSeanceListToVM,
  ProfLight_VM,
} from '@shared/index';

import { RefDataRepository } from './refdata.repository';
import { SaisonApiService } from '../services/saison-api.service';
import { SeanceApiService } from '../services/seance-api.service';
import { SeanceProfesseurApiService } from '../services/seance-professeur-api.service';
import { SeanceMapper } from '../mapper/seance.mapper';
import { SeancePageData } from '../vm/seance-page.vm';
import { AppStore } from '../app/app.store';
import { LienGroupeApiService } from '../services/lien-groupe-api.service';

@Injectable({ providedIn: 'root' })
export class SeanceRepository {
  constructor(
    private readonly refDataRepository: RefDataRepository,
    private readonly saisonServ: SaisonApiService,
    private readonly seancesService: SeanceApiService,
  private readonly lienGroupeApi: LienGroupeApiService,
    private readonly spService: SeanceProfesseurApiService,
    private readonly appstore: AppStore,
    private readonly mapper: SeanceMapper,
  ) {}

  async loadPageData(saisonId: number): Promise<SeancePageData> {
    const storedProjectId = this.appstore.selectedProjectId();
    const [saisons, listeprof, listelieu, listegroupe, listeCours, list] = await Promise.all([
      this.saisonServ.list(),
      this.refDataRepository.getProfs(storedProjectId, saisonId),
      this.refDataRepository.getLieux(storedProjectId),
      this.refDataRepository.getGroupes(saisonId),
      this.refDataRepository.getCours(storedProjectId, saisonId),
      this.loadSeances(saisonId),
    ]);

    const activeSaison =
      saisons.find((x) => x.id === saisonId) ??
      saisons.find((x) => x.active === true) ??
      saisons[0] ??
      null;

    const listeProfFilter: KeyValuePair[] = (listeprof ?? []).map((x) => ({
      key: x.contrat_id ?? x.id ?? 0,
      value: `${x.prenom ?? ''} ${x.nom ?? ''}`.trim(),
    }));

    const refs = this.mapper.buildReferencesVm(
      listeCours,
      listegroupe,
      listelieu.map((x) => ({ key: x.id, value: x.nom ?? '' })),
      listeProfFilter,
      saisons,
    );

    return this.mapper.buildPageData(refs, list, activeSaison);
  }

 async loadSeances(saisonId: number): Promise<Seance_VM[]> {
  const storedProjectId = this.appstore.selectedProjectId();

  const [seances, listelieu, listeCours, listeprof, listegroupe] = await Promise.all([
    this.seancesService.list(saisonId),
    this.refDataRepository.getLieux(storedProjectId),
    this.refDataRepository.getCours(storedProjectId, saisonId),
    this.refDataRepository.getProfs(storedProjectId, saisonId),
    this.refDataRepository.getGroupes(saisonId),
  ]);

  const lieuxById = new Map(listelieu.map((x) => [x.id, x]));
  const coursById = new Map(listeCours.map((x) => [x.id, x]));
  const profsByContratId = new Map(
    listeprof
      .filter((p) => typeof p.contrat_id === 'number')
      .map((p) => [p.contrat_id as number, p]),
  );
  const groupesById = new Map(listegroupe.map((g) => [g.id, g]));

  const seanceIds = seances
    .map((x: Seance) => x.seance_id ?? x.id)
    .filter((x: number) => !!x);

  const [profLinks, groupesBySeanceId] = await Promise.all([
    seanceIds.length ? this.spService.get_list_by_idseance(seanceIds) : [],
    seanceIds.length ? this.lienGroupeApi.listGroupesBySeanceId(seanceIds) : {},
  ]);

  const contratsBySeanceId = new Map<number, number[]>();
  for (const row of profLinks) {
    const current = contratsBySeanceId.get(row.seance_id) ?? [];
    current.push(row.professeurcontract_id);
    contratsBySeanceId.set(row.seance_id, current);
  }

  const list = mapSeanceListToVM(seances, {
    lieuxById,
    coursById,
    profsByContratId,
    contratsBySeanceId,
  });
  return list.map((seanceVm) => {
    const groupeIds = groupesBySeanceId[seanceVm.id] ?? [];

    const groupes = groupeIds
      .map((id) => groupesById.get(id))
      .filter((g): g is NonNullable<typeof g> => !!g);
    return {
      ...seanceVm,
      groupes,
    };
  });
}

  async loadSeance(id: number, saisonId: number): Promise<Seance_VM> {
  const storedProjectId = this.appstore.selectedProjectId();

  const [raw, listelieu, listeCours, listeprof, listegroupe, profLinks, groupesBySeanceId] =
    await Promise.all([
      this.seancesService.get(id),
      this.refDataRepository.getLieux(storedProjectId),
      this.refDataRepository.getCours(storedProjectId, saisonId),
      this.refDataRepository.getProfs(storedProjectId, saisonId),
      this.refDataRepository.getGroupes(saisonId),
      this.spService.get_list_by_idseance([id]),
      this.lienGroupeApi.listGroupesBySeanceId([id]),
    ]);

  const lieuxById = new Map(listelieu.map((x) => [x.id, x]));
  const coursById = new Map(listeCours.map((x) => [x.id, x]));
  const profsByContratId = new Map(
    listeprof
      .filter((p) => typeof p.contrat_id === 'number')
      .map((p) => [p.contrat_id as number, p]),
  );
  const groupesById = new Map(listegroupe.map((g) => [g.id, g]));

  const contratsBySeanceId = new Map<number, number[]>();
  for (const row of profLinks) {
    const current = contratsBySeanceId.get(row.seance_id) ?? [];
    current.push(row.professeurcontract_id);
    contratsBySeanceId.set(row.seance_id, current);
  }

  const seanceVm = mapSeanceToVM(raw, {
    lieuxById,
    coursById,
    profsByContratId,
    contratsBySeanceId,
  });

  const groupeIds = groupesBySeanceId[seanceVm.id] ?? [];
  const groupes = groupeIds
    .map((gid) => groupesById.get(gid))
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

  async updateSeanceProfs(seanceId: number, profs: ProfLight_VM[]): Promise<void> {
    await this.spService.updatelist(seanceId, profs.map((p) => p.contrat_id ?? 0).filter((id) => id > 0));
  }

  async updateSeanceGroupes(seanceId: number, groupeIds: number[]): Promise<void> {
    await this.lienGroupeApi.updateGroupesForSeance(seanceId, groupeIds);
  }   
}
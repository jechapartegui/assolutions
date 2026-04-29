import { Injectable } from '@angular/core';
import { Cours_VM, Groupe, Lieu_VM, ProfLight_VM } from '@shared/index';
import { mapCoursListToVM } from '@shared/lib/cours.interface';
import { mapLieuxToVM } from '@shared/lib/lieu.interface';

import { ContratProfApiService } from '../services/contrat-prof-api.service';
import { CoursApiService } from '../services/cours-api.service';
import { CoursProfesseurApiService } from '../services/cours-professeur-api.service';
import { GroupesApiService } from '../services/groupes-api.service';
import { LienGroupeApiService } from '../services/lien-groupe-api.service';
import { LieuApiService } from '../services/lieu-api.service';
import { PersonneApiService } from '../services/personne-api.service';
import { RefDataStore } from '../store/ref-data.store';

@Injectable({ providedIn: 'root' })
export class RefDataRepository {
  constructor(
    private readonly refStore: RefDataStore,
    private readonly contratProfApi: ContratProfApiService,
    private readonly personneApi: PersonneApiService,
    private readonly lieuApi: LieuApiService,
    private readonly coursApi: CoursApiService,
    private readonly groupeApi: GroupesApiService,
    private readonly lienGroupeApi: LienGroupeApiService,
    private readonly coursProfApi: CoursProfesseurApiService,
  ) {}

  async getLieux(projectId: number, forceRefresh = false): Promise<Lieu_VM[]> {
    const state = this.refStore.getLieuxState(projectId);
    if (!forceRefresh && state.Liste.length) {
      return state.Liste;
    }

    this.refStore.setLieuxLoading(projectId, true);

    try {
      const raw = await this.lieuApi.list();
      const mapped = mapLieuxToVM(raw);
      this.refStore.applyLieux(projectId, mapped);
      return mapped;
    } catch (e: any) {
      this.refStore.setLieuxLoading(projectId, false, e?.message ?? 'Erreur chargement lieux');
      throw e;
    }
  }

  async getGroupes(saisonId: number, forceRefresh = false): Promise<Groupe[]> {
    const state = this.refStore.getGroupesState(saisonId);
    if (!forceRefresh && state.Liste.length) {
      return state.Liste;
    }

    this.refStore.setGroupesLoading(saisonId, true);

    try {
      const raw = await this.groupeApi.list(saisonId);
      this.refStore.applyGroupes(saisonId, raw);
      return raw;
    } catch (e: any) {
      this.refStore.setGroupesLoading(saisonId, false, e?.message ?? 'Erreur chargement groupes');
      throw e;
    }
  }

async getProfs(
  projectId: number,
  saisonId: number,
  forceRefresh = false
): Promise<ProfLight_VM[]> {
  const state = this.refStore.getProfsState(projectId, saisonId);
  if (!forceRefresh && state.Liste.length) {
    return state.Liste;
  }

  this.refStore.setProfsLoading(projectId, saisonId, true);

  try {
    const contrats = await this.contratProfApi.list(saisonId);

    const profIds = contrats
      .map((c: any) => c.professeur_id)
      .filter((id: unknown): id is number => typeof id === 'number');

    if (!profIds.length) {
      this.refStore.applyProfs(projectId, saisonId, []);
      return [];
    }

    const personnes = await this.personneApi.list_personnelight(profIds);

    const profs: ProfLight_VM[] = personnes.map((p: any) => {
      const contrat = contrats.find((c: any) => c.professeur_id === p.id);
      return {
        ...p,
        contrat_id: contrat?.id ?? null,
      };
    });

    this.refStore.applyProfs(projectId, saisonId, profs);
    return profs;
  } catch (e: any) {
    this.refStore.setProfsLoading(
      projectId,
      saisonId,
      false,
      e?.message ?? 'Erreur chargement profs'
    );
    throw e;
  }
}

  async getCours(
    projectId: number,
    saisonId: number,
    forceRefresh = false,
  ): Promise<Cours_VM[]> {
    const state = this.refStore.getCoursState(saisonId);
    if (!forceRefresh && state.Liste.length) {
      return state.Liste;
    }

    this.refStore.setCoursLoading(saisonId, true);

    try {
      const [listelieu, listegroupe, listeprof, cours] = await Promise.all([
        this.getLieux(projectId),
        this.getGroupes(projectId),
        this.getProfs(projectId, saisonId),
        this.coursApi.list(saisonId),
      ]);

      const coursIds = cours.map((c: any) => c.id);
      const [groupesByCoursId, contratsByCoursId] = await Promise.all([
        this.lienGroupeApi.listGroupesByCoursId(coursIds),
        this.coursProfApi.listProfsByCoursId(coursIds),
      ]);

      const mapped = mapCoursListToVM(
        cours,
        listelieu,
        listegroupe,
        listeprof,
        { groupesByCoursId, contratsByCoursId },
      );

      this.refStore.applyCours(saisonId, mapped);
      return mapped;
    } catch (e: any) {
      this.refStore.setCoursLoading(saisonId, false, e?.message ?? 'Erreur chargement cours');
      throw e;
    }
  }

  async warmup(projectId: number, saisonId: number): Promise<void> {
    await Promise.all([
      this.getLieux(projectId),
      this.getGroupes(projectId),
      this.getProfs(projectId, saisonId),
      this.getCours(projectId, saisonId),
    ]);
  }
}
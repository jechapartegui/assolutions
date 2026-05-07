import { Injectable } from '@angular/core';
import {
  AdhMenDto,
  AdhMenHydrated,
  CreateInscriptionSeanceDto,
  InscriptionStatus_VM,
  InscriptionStatusDto,
  MesSeanceHydrated,
  PersonneLight_VM,
  Seance,
  SeanceProfesseur_Light,
  SeanceStatus_VM,
} from '@shared/index';

import { AdherentMenu } from '../class/adherent-menu';
import { AdhesionApiService } from '../services/adhesion-api.service';
import { InscriptionSeanceApiService } from '../services/inscription-seance-api.service';
import { MesSeancesApiService } from '../services/mes-seances-api.service';
import { SeanceProfesseurApiService } from '../services/seance-professeur-api.service';
import { MenuMapper } from '../mapper/menu.mapper';
import { RefDataRepository } from './refdata.repository';
import { MenuPendingRefresh, MenuReferencesVm } from '../vm/menu.vm';
import { SeanceApiService } from '../services/seance-api.service';
import { PersonneApiService } from '../services/personne-api.service';
import { DocumentApiService } from '../services/document-api.service';

type RiderSource = {
  profil: 'ADH' | 'PROF';
  dto: AdhMenDto;
};

@Injectable({ providedIn: 'root' })
export class MenuRepository {
constructor(
  private readonly adhesionApi: AdhesionApiService,
  private readonly maSeanceApi: MesSeancesApiService,
  private readonly seanceProfApi: SeanceProfesseurApiService,
  private readonly inscriptionSeanceApi: InscriptionSeanceApiService,
  private readonly refDataRepository: RefDataRepository,
  private readonly menuMapper: MenuMapper,
  private readonly personneApi: PersonneApiService,
  private readonly seanceApi: SeanceApiService,
  private readonly documentapi: DocumentApiService,
) {}

async loadMenuData(
  projectId: number,
  saisonId: number,
  rights: { adherent?: boolean; prof?: boolean; essai?: boolean } | null,
): Promise<MenuPendingRefresh> {
  const [anniversaire, refs] = await Promise.all([
    this.loadAnniversaire(saisonId),
    this.loadReferenceData(projectId, saisonId),
  ]);
  const { yesterday, nextMonth } = this.computeDefaultDates();
  const riders = await this.loadRiders(rights, yesterday, nextMonth, refs);
  return {
    riders,
    anniversaire,
    refs,
  };
}
  async loadAnniversaire(saisonId: number): Promise<string[]> {
    try {
      return await this.adhesionApi.Anniversaire(saisonId);
    } catch {
      return [];
    }
  }

  async loadReferenceData(projectId: number, saisonId: number): Promise<MenuReferencesVm> {
    const [listeprof, listelieu, listegroupe, listeCours] = await Promise.all([
      this.refDataRepository.getProfs(projectId, saisonId),
      this.refDataRepository.getLieux(projectId),
      this.refDataRepository.getGroupes(saisonId),
      this.refDataRepository.getCours(projectId, saisonId),
    ]);

    return this.menuMapper.buildReferencesVm(
      listeprof,
      listelieu,
      listegroupe,
      listeCours,
    );
  }


async loadRiders(
  rights: { adherent?: boolean; prof?: boolean; essai?: boolean } | null,
  yesterday: Date,
  nextMonth: Date,
  refs: MenuReferencesVm,
): Promise<AdherentMenu[]> {
  const sources: RiderSource[] = [];

  if (rights?.adherent || rights?.essai) {
    const adhDtos = await this.loadAdherentDtos();
    sources.push(
      ...adhDtos.map((dto) => ({
        profil: 'ADH' as const,
        dto,
      }))
    );
  }

  if (rights?.prof) {
    const profDtos = await this.loadProfDtos();
    sources.push(
      ...profDtos.map((dto) => ({
        profil: 'PROF' as const,
        dto,
      }))
    );
  }

  if (!sources.length) {
    return [];
  }

  const hydratedDtos = await this.hydrateAdhMenDtos(
    sources.map((x) => x.dto)
  );

  const hydratedByPersonId = new Map<number, AdhMenHydrated>(
    hydratedDtos.map((x) => [x.personne.id, x])
  );

  const riders: AdherentMenu[] = sources
    .map((source) => {
      const hydrated = hydratedByPersonId.get(source.dto.personne.id);
      if (!hydrated) return null;

      return this.menuMapper.toAdherentMenu(
  hydrated,
  refs,
  source.profil,
  yesterday,
  nextMonth
);
    })
    .filter((x): x is AdherentMenu => x !== null);

  this.menuMapper.sortRiderSeances(riders);
  riders.sort((a, b) => a.id - b.id);

  return riders;
}

/**
 * DTO bruts adhérents
 */
private async loadAdherentDtos(): Promise<AdhMenDto[]> {
  return await this.maSeanceApi.get();
}

/**
 * DTO bruts profs normalisés dans le même format que AdhMenDto
 */
private async loadProfDtos(): Promise<AdhMenDto[]> {
  const raw: AdhMenDto[] = await this.maSeanceApi.prof();
  return raw;
}



private async hydrateAdhMenDtos(
  dtos: AdhMenDto[],
): Promise<AdhMenHydrated[]> {
  if (!dtos.length) return [];

  const personneIds = Array.from(
    new Set(
      dtos
        .map((dto) => dto.personne.id)
        .filter((id): id is number => typeof id === 'number' && id > 0)
    )
  );

  const seanceIds = Array.from(
    new Set(
      dtos.flatMap((dto) =>
        (dto.mes_seances ?? [])
          .map((ms) => ms.seance.id)
          .filter((id): id is number => typeof id === 'number' && id > 0)
      )
    )
  );

  const [personnes, seances, seanceProfs, photosByPersonne] = await Promise.all([
    personneIds.length
      ? this.personneApi.list_personnelight(personneIds, false)
      : Promise.resolve([] as PersonneLight_VM[]),

    seanceIds.length
      ? this.seanceApi.get_seance_by_ids(seanceIds)
      : Promise.resolve([] as Seance[]),

    seanceIds.length
      ? this.seanceProfApi.get_list_by_idseance(seanceIds)
      : Promise.resolve([] as SeanceProfesseur_Light[]),

    personneIds.length
      ? this.documentapi.photo_by_id(personneIds)
      : Promise.resolve({} as { [id: number]: string | null }),
  ]);

  const personnesById = new Map<number, PersonneLight_VM>(
    personnes.map((p) => [p.id, p]),
  );

  const seancesById = new Map<number, Seance>(
    seances.map((s) => [s.seance_id, s]),
  );

  const profsBySeanceId = new Map<number, SeanceProfesseur_Light[]>();
  for (const sp of seanceProfs) {
    const sid = sp.seance_id;
    const current = profsBySeanceId.get(sid) ?? [];
    current.push(sp);
    profsBySeanceId.set(sid, current);
  }

  return dtos
    .map<AdhMenHydrated | null>((dto) => {
      const personne = personnesById.get(dto.personne.id);
      if (!personne) return null;
      personne.photo = photosByPersonne[dto.personne.id] ?? null;
      const mes_seances: MesSeanceHydrated[] = (dto.mes_seances ?? [])
        .map<MesSeanceHydrated | null>((ms) => {
          const seance = seancesById.get(ms.seance.id);
          if (!seance) return null;

          return {
            seance,
            seanceProfesseurs: profsBySeanceId.get(seance.seance_id) ?? [],
            statutInscription: ms.statutInscription ?? null,
          };
        })
        .filter((x): x is MesSeanceHydrated => x !== null);

      return {
        personne,
        mes_seances,
      } as AdhMenHydrated;
    })
    .filter((x): x is AdhMenHydrated => x !== null);
}
/**
 * Convertit le statut VM éventuel du flux prof vers le DTO string attendu
 */
private mapInscriptionStatusVmToDto(
  statut: InscriptionStatus_VM | null | undefined,
): InscriptionStatusDto {
  switch (statut) {
    case InscriptionStatus_VM.PRESENT:
      return 'présent';
    case InscriptionStatus_VM.ABSENT:
      return 'absent';
    case InscriptionStatus_VM.CONVOQUE:
      return 'convoqué';
    case InscriptionStatus_VM.ESSAI:
      return 'essai';
    default:
      return null;
  }
}
  

  hasChanged(current: MenuPendingRefresh | null, incoming: MenuPendingRefresh | null): boolean {
    if (!current && incoming) return true;
    if (!incoming) return false;

    const fp1 = this.computeFingerprint(current);
    const fp2 = this.computeFingerprint(incoming);

    return fp1 !== fp2;
  }

  private computeFingerprint(data: MenuPendingRefresh): string {
    const ridersPart = (data.riders ?? [])
      .map((r) => {
        const seances = (r.MesSeances ?? [])
          .map((ms: any) => {
            const s = ms.seance ?? {};
            return [
              s.id ?? '',
              s.date ?? s.date_seance ?? '',
              s.heure_debut ?? '',
              s.cours_id ?? '',
              s.lieu_id ?? '',
              s.professeur_id ?? '',
              ms.statutInscription ?? '',
            ].join(':');
          })
          .sort()
          .join('|');

        return [r.id, r.profil, r.nom, r.prenom, seances].join('#');
      })
      .sort()
      .join('||');

    const annivPart = (data.anniversaire ?? []).slice().sort().join('|');

    const refsPart = [
      (data.refs.listelieu ?? []).map((x) => `${x.id}:${x.nom ?? ''}`).sort().join('|'),
      (data.refs.listeCours ?? []).map((x) => `${x.id}:${x.nom ?? ''}`).sort().join('|'),
      (data.refs.listeprof ?? []).map((x) => `${x.id}:${x.prenom ?? ''}:${x.nom ?? ''}`).sort().join('|'),
      (data.refs.listegroupe ?? []).map((x) => `${x.id}:${x.nom ?? ''}`).sort().join('|'),
    ].join('///');

    return [ridersPart, annivPart, refsPart].join('§§§');
  }

  private computeDefaultDates(): { yesterday: Date; nextMonth: Date } {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 3);

    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);

    return { yesterday, nextMonth };
  }

  async updateInscription(
    seance_id: number,
    rider_id: number,
    statut_inscription?: InscriptionStatus_VM | null,
    statut_seance?: SeanceStatus_VM | null
  ): Promise<void> {
    const dto: CreateInscriptionSeanceDto = {
      seance_id: seance_id,
      personne_id: rider_id,
      statut_inscription,
      statut_seance
    };

    await this.inscriptionSeanceApi.maj(dto);

   
  }
}
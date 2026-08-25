import { Injectable } from '@angular/core';
import { SaisonApiService } from '../services/saison-api.service';
import { InscriptionSaisonApiService } from '../services/inscription-saison-api.service';
import { InscriptionSeanceApiService } from '../services/inscription-seance-api.service';
import { AdherentMapper } from '../mapper/adherent.mapper';

import { ItemContact, Personne } from '@shared/lib/personne.interface';
import { InscriptionSaison } from '@shared/lib/inscription-saison.interface';
import { InscriptionSeance } from '@shared/lib/inscription-seance.interface';
import { Groupe, LienGroupe_VM } from '@shared/lib/groupes.interface';

import {
  AdherentDetail_VM,
  AdherentListItem_VM,
  AdherentPageData,
} from '../vm/adherent-page.vm';
import { Adresse } from '@shared/index';
import { PersonneDataStore } from '../data-store/personne-data.store';
import { GroupesApiService } from '../services/groupes-api.service';
import { LienGroupeApiService } from '../services/lien-groupe-api.service';
import { ContactApiService, ContactDto, CreateContactDto } from '../services/contact-api.service';

@Injectable({ providedIn: 'root' })
export class AdherentRepository {
  constructor(
    private readonly inscriptionSaisonApi: InscriptionSaisonApiService,
    private readonly inscriptionSeanceApi: InscriptionSeanceApiService,
    private readonly mapper: AdherentMapper,
    private readonly contactservice: ContactApiService,
    private readonly saisonService: SaisonApiService,
    private readonly personneDataStore: PersonneDataStore,
    private readonly groupesApi: GroupesApiService,
    private readonly liengroupeapi: LienGroupeApiService,
  ) {}

  /**
   * Compat temporaire : certains écrans attendent encore un PageData complet.
   * La cible est : AdherentDataStore pour la liste/detail, AdherentStore pour la VM écran.
   */
  async loadPageData(saisonId: number): Promise<AdherentPageData> {
    const [shell, list] = await Promise.all([
      this.loadEditorShell(saisonId),
      this.loadAdherentListForSaison(saisonId),
    ]);

    return this.mapper.buildPageData(shell.refs!, list, shell.activeSaison ?? null);
  }

  async loadEditorShell(saisonId: number): Promise<Partial<AdherentPageData>> {
    const [saisons, groupes] = await Promise.all([
      this.saisonService.list(),
      this.groupesApi.list(saisonId),
    ]);

    const activeSaison =
      saisons.find((x) => x.id === saisonId) ??
      saisons.find((x) => x.active) ??
      saisons[0] ??
      null;

    const refs = this.mapper.buildReferencesVm(saisons, groupes);

    return {
      refs,
      list: [],
      activeSaison,
    };
  }

  async loadMonCompteDetail(
    id: number,
    saisonId: number,
  ): Promise<Partial<AdherentPageData> & { editAdherent: AdherentDetail_VM }> {
    const shell = await this.loadEditorShell(saisonId);
    const editAdherent = await this.loadAdherentDetail(id, saisonId);

    return {
      ...shell,
      editAdherent,
    };
  }

  async loadAdherentListForSaison(
    saisonId: number,
    options: { includePhotos?: boolean; force?: boolean } = { includePhotos: true },
  ): Promise<AdherentListItem_VM[]> {
    const [inscriptionsSaison, personneAvecSeanceIds] = await Promise.all([
      this.loadInscriptionsSaisonForSaison(saisonId),
      this.loadUniqueInscriptionSeanceForSaison(saisonId),
    ]);

    const ids = this.cleanIds([
      ...((inscriptionsSaison ?? []).map((x) => Number(x.personne_id))),
      ...(personneAvecSeanceIds ?? []),
    ]);

    return this.loadAdherentListByIds(ids, saisonId, {
      includePhotos: options.includePhotos ?? true,
      inscriptionsSaison,
      personneAvecSeanceIds,
    });
  }

  async loadAdherentListByIds(
    ids: number[],
    saisonId: number,
    options: {
      includePhotos?: boolean;
      inscriptionsSaison?: InscriptionSaison[];
      personneAvecSeanceIds?: number[];
    } = { includePhotos: true },
  ): Promise<AdherentListItem_VM[]> {
    const personneIds = this.cleanIds(ids);
    if (!personneIds.length) return [];

    const [personnes, groupes, inscriptionsSaison, groupeByPersonne, contactslist] = await Promise.all([
      this.personneDataStore.loadPartialByIds(personneIds, { includePhotos: options.includePhotos ?? true }),
      this.groupesApi.list(saisonId),
      options.inscriptionsSaison
        ? Promise.resolve(options.inscriptionsSaison)
        : this.loadInscriptionsSaisonForSaison(saisonId),
      this.liengroupeapi.listGroupesByPersonne(personneIds),
      this.contactservice.list_by_id(personneIds),
    ]);

    const personnesById: Record<number, Personne> = {};
    for (const personne of personnes ?? []) {
      personnesById[Number(personne.id)] = personne;
    }

    const photosByPersonne = this.personneDataStore.photosById();
    const inscriptionsSaisonByPersonne: Record<number, InscriptionSaison[]> = {};
    for (const ins of inscriptionsSaison ?? []) {
      const personneId = Number(ins.personne_id);
      (inscriptionsSaisonByPersonne[personneId] ??= []).push(ins);
    }

    const groupesById = new Map<number, Groupe>(
      (groupes ?? []).map((g: Groupe) => [Number(g.id), g]),
    );

    const contactsByPersonneId: Record<number, ContactDto[]> = {};
    for (const cont of contactslist ?? []) {
      (contactsByPersonneId[Number(cont.object_id)] ??= []).push(cont);
    }

    const personneAvecSeanceSet = new Set(this.cleanIds(options.personneAvecSeanceIds ?? []));
    const list: AdherentListItem_VM[] = [];

    for (const personneId of personneIds) {
      const rawPersonne = personnesById[personneId];
      if (!rawPersonne) continue;

      const inscriptionSaisonActive =
        (inscriptionsSaisonByPersonne[personneId] ?? []).find((x) => x.saison_id === saisonId) ?? null;

      const groupeIds = ((groupeByPersonne as Record<number, number[]>)[personneId] ?? [])
        .map((id: any) => Number(id))
        .filter((id: number) => Number.isFinite(id) && id > 0);

      const groupesActifs: LienGroupe_VM[] = groupeIds
        .map((groupeId: number) => {
          const groupe = groupesById.get(groupeId);
          if (!groupe) return null;

          return {
            id: groupeId,
            groupe_id: groupeId,
            nom: groupe.nom,
            id_lien: 0,
          } as LienGroupe_VM;
        })
        .filter((groupe): groupe is LienGroupe_VM => !!groupe);

      list.push(
        this.mapper.toAdherentListItemVm({
          rawPersonne,
          activeSaisonId: saisonId,
          inscriptionSaisonActive,
          nbInscriptionsSeance: personneAvecSeanceSet.has(personneId) ? 1 : 0,
          contacts: contactsByPersonneId[personneId] ?? [],
          photo: photosByPersonne[personneId] ?? null,
          groupesActifs,
        }),
      );
    }

    return this.mapper.sortByNom(list, 'ASC');
  }

  async loadAdherentDetail(id: number, saisonId: number): Promise<AdherentDetail_VM> {
    const [personne, inscriptionsSaison, inscriptionsSeance, groupesParSaison, listeGroupes, contacts] = await Promise.all([
      this.personneDataStore.getOrLoad(id, { includePhoto: true }),
      this.loadInscriptionsSaisonForPersonne(id),
      this.loadInscriptionsSeanceForPersonne(id, saisonId),
      this.liengroupeapi.lienGroupeByPersonne(id, saisonId),
      this.groupesApi.list(saisonId),
      this.contactservice.list_by_id([id]),
    ]);

    const detail = this.mapper.toAdherentDetailVm(
      personne,
      inscriptionsSaison,
      inscriptionsSeance,
      groupesParSaison,
      contacts ?? [],
      saisonId,
      listeGroupes,
    );

    detail.photo = this.personneDataStore.photoById(id);
    return detail;
  }

  async createAdherent(vm: AdherentDetail_VM, saisonId: number): Promise<AdherentDetail_VM> {
    const compteId = Number(vm.compte);
    if (!compteId) {
      throw new Error('Le compte associé est obligatoire.');
    }

    const dto = {
      compte: compteId,
      date_naissance: this.toIsoDate(vm.date_naissance),
      last_name: vm.nom ?? '',
      first_name: vm.prenom ?? '',
      nickname: vm.surnom ?? null,
      gender: !!vm.sexe,
      address: JSON.stringify(vm.adresse ?? new Adresse()),
      archive: !!vm.archive,
      photo: vm.photo ?? null,
    };

    const saved = await this.personneDataStore.create(dto, { photo: vm.photo ?? null });

    await this.syncContacts(saved.id, vm.contact ?? [], 'liste_contact');
    await this.syncContacts(saved.id, vm.contact_prevenir ?? [], 'liste_contact_prevenir');
    await this.syncGroupes(saved.id, saisonId, vm.groupesParSaison ?? []);

    return this.loadAdherentDetail(saved.id, saisonId);
  }

  async updateAdherent(vm: AdherentDetail_VM, saisonId: number): Promise<AdherentDetail_VM> {
    const dto = {
      compte: Number(vm.compte),
      date_naissance: this.toIsoDate(vm.date_naissance),
      last_name: vm.nom ?? '',
      first_name: vm.prenom ?? '',
      nickname: vm.surnom ?? null,
      gender: !!vm.sexe,
      address: JSON.stringify(vm.adresse ?? new Adresse()),
      archive: !!vm.archive,
      photo: vm.photo ?? null,
    };

    await this.personneDataStore.update(vm.id, dto, { photo: vm.photo ?? null });

    await this.syncContacts(vm.id, vm.contact ?? [], 'liste_contact');
    await this.syncContacts(vm.id, vm.contact_prevenir ?? [], 'liste_contact_prevenir');
    await this.syncGroupes(vm.id, saisonId, vm.groupesParSaison ?? []);

    return this.loadAdherentDetail(vm.id, saisonId);
  }

  async deleteAdherent(id: number): Promise<void> {
    await this.personneDataStore.delete(id);
  }

  private async syncContacts(
    personneId: number,
    contacts: ItemContact[],
    contactList: 'liste_contact' | 'liste_contact_prevenir',
  ): Promise<void> {
    const existing = (await this.contactservice.list_by_id([personneId]))
      .filter((c) => c.contact_list === contactList);

    const nextContacts = (contacts ?? [])
      .filter((c) => !!c.Value?.trim())
      .map((c) => ({
        ...c,
        Value: c.Value.trim(),
        Diffusion: c.Type === 'EMAIL' ? !!c.Diffusion : false,
      }));

    const nextIds = new Set(
      nextContacts
        .filter((c) => (c.id ?? 0) > 0)
        .map((c) => c.id),
    );

    for (const old of existing) {
      if (!nextIds.has(old.id)) {
        await this.contactservice.remove(old.id);
      }
    }

    for (const c of nextContacts) {
      const payload: CreateContactDto = {
        object_type: 'rider',
        object_id: personneId,
        contact_type: c.Type,
        contact_value: c.Value,
        diffusion: c.Type === 'EMAIL' ? !!c.Diffusion : false,
        contact_list: contactList,
        info: c.Info ?? '',
        pref: !!c.Pref,
      };

      if ((c.id ?? 0) > 0) {
        await this.contactservice.update(c.id, payload);
      } else {
        await this.contactservice.create(payload);
      }
    }
  }

  /**
   * La fiche adhérent manipule les groupes localement. Jusqu'ici la sauvegarde
   * ne persistait que personne + contacts : les cases revenaient donc à leur
   * ancienne valeur après rechargement. On synchronise maintenant les liens
   * rider de la saison exactement comme le fait l'écran Groupe.
   */
  private async syncGroupes(
    personneId: number,
    saisonId: number,
    selected: LienGroupe_VM[],
  ): Promise<void> {
    if (!personneId || !saisonId) return;

    const existing = await this.liengroupeapi.lienGroupeByPersonne(
      Number(personneId),
      Number(saisonId),
    );

    const targetIds = new Set(
      (selected ?? [])
        .map((item: any) => Number(item?.groupe_id ?? item?.id ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0),
    );

    const existingByGroup = new Map(
      (existing ?? []).map((link: any) => [Number(link.groupe_id), link]),
    );

    for (const link of existing ?? []) {
      const groupeId = Number((link as any).groupe_id);
      if (!targetIds.has(groupeId)) {
        await this.liengroupeapi.remove(Number((link as any).id));
      }
    }

    for (const groupeId of targetIds) {
      if (existingByGroup.has(groupeId)) continue;
      await this.liengroupeapi.create({
        groupe_id: groupeId,
        object_id: Number(personneId),
        object_type: 'rider',
      } as any);
    }
  }

  private async loadInscriptionsSaisonForSaison(saisonId: number): Promise<InscriptionSaison[]> {
    const all = await this.inscriptionSaisonApi.listsaison(saisonId);
    return all ?? [];
  }

  private async loadUniqueInscriptionSeanceForSaison(saisonId: number): Promise<number[]> {
    const all = await this.inscriptionSeanceApi.listBySaison_UniqueID(saisonId);
    return all ?? [];
  }

  private async loadInscriptionsSaisonForPersonne(personneId: number): Promise<InscriptionSaison[]> {
    const all = await this.inscriptionSaisonApi.listForPersonne(personneId);
    return all ?? [];
  }

  private async loadInscriptionsSeanceForPersonne(personneId: number, saisonId: number): Promise<InscriptionSeance[]> {
    const all = await this.inscriptionSeanceApi.listByPersonneAndSaison(personneId, saisonId);
    return all ?? [];
  }

  private toIsoDate(value: Date | string): string {
    if (typeof value === 'string') return value.slice(0, 10);
    return new Date(
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()),
    ).toISOString().slice(0, 10);
  }

  private cleanIds(ids: number[]): number[] {
    return [...new Set((ids ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0))];
  }
}

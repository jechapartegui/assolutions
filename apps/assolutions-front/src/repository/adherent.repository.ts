import { Injectable } from '@angular/core';
import { SaisonApiService } from '../services/saison-api.service';
import { AdhesionApiService } from '../services/adhesion-api.service';
import { InscriptionSaisonApiService } from '../services/inscription-saison-api.service';
import { InscriptionSeanceApiService } from '../services/inscription-seance-api.service';
import { AdherentMapper } from '../mapper/adherent.mapper';

import { ItemContact, Personne } from '@shared/lib/personne.interface';
import { InscriptionSaison } from '@shared/lib/inscription-saison.interface';
import { InscriptionSeance } from '@shared/lib/inscription-seance.interface';
import { LienGroupe_VM } from '@shared/lib/groupes.interface';

import {
  AdherentDetail_VM,
  AdherentListItem_VM,
  AdherentPageData,
} from '../vm/adherent-page.vm';
import { Adresse } from '@shared/index';
import { AppStore } from '../app/app.store';
import { RefDataRepository } from './refdata.repository';
import { PersonneApiService } from '../services/personne-api.service';
import { LienGroupeApiService } from '../services/lien-groupe-api.service';
import { DocumentApiService } from '../services/document-api.service';
import { ContactApiService, ContactDto, CreateContactDto, UpdateContactDto } from '../services/contact-api.service';
import { AddInfoApiService } from '../services/addinfo-api.service';

@Injectable({ providedIn: 'root' })
export class AdherentRepository {
  constructor(
    private readonly adherentApi: AdhesionApiService,
    private readonly inscriptionSaisonApi: InscriptionSaisonApiService,
    private readonly inscriptionSeanceApi: InscriptionSeanceApiService,
    private readonly mapper: AdherentMapper,
    private readonly appStore: AppStore,
    private readonly contactservice: ContactApiService,
    private readonly saisonService: SaisonApiService,
    private readonly personneapi: PersonneApiService,
    private readonly refDataRepository: RefDataRepository,
    private readonly liengroupeapi: LienGroupeApiService,
    private readonly documentapi: DocumentApiService,
    private readonly addInfoApiService: AddInfoApiService,
  ) {}

async loadPageData(saisonId: number): Promise<AdherentPageData> {
  const [saisons, groupes, inscriptionsSaison, personneTotale] = await Promise.all([
    this.saisonService.list(),
    this.refDataRepository.getGroupes(saisonId),
    this.loadInscriptionsSaisonForSaison(saisonId),
    this.loadUniqueInscriptionSeanceForSaison(saisonId),
  ]);

  const listePersonneTotale = [...new Set(personneTotale ?? [])];

  const [personnes, photosByPersonne, groupeByPersonne, contactslist] = await Promise.all([
    listePersonneTotale.length
      ? this.personneapi.list_by_id(listePersonneTotale)
      : Promise.resolve([]),
    this.documentapi.photo_by_id(listePersonneTotale),
    this.liengroupeapi.listGroupesByPersonne(listePersonneTotale),
    this.contactservice.list_by_id(listePersonneTotale),
  ]);

  const activeSaison =
    saisons.find((x) => x.id === saisonId) ??
    saisons.find((x) => x.active) ??
    saisons[0] ??
    null;

  const refs = this.mapper.buildReferencesVm(saisons, groupes);

  const personnesById: Record<number, Personne> = {};
  for (const personne of personnes) {
    personnesById[personne.id] = personne;
  }

  const inscriptionsSaisonByPersonne: Record<number, InscriptionSaison[]> = {};
  for (const ins of inscriptionsSaison) {
    if (!inscriptionsSaisonByPersonne[ins.personne_id]) {
      inscriptionsSaisonByPersonne[ins.personne_id] = [];
    }
    inscriptionsSaisonByPersonne[ins.personne_id].push(ins);
  }

  const groupesById: Record<number, any> = {};
  for (const groupe of groupes) {
    groupesById[groupe.id] = groupe;
  }

  const list: AdherentListItem_VM[] = [];

  for (const personneId of listePersonneTotale) {
    const rawPersonne = personnesById[personneId];
    if (!rawPersonne) continue;

    const inscriptionSaisonActive =
      (inscriptionsSaisonByPersonne[personneId] ?? []).find(x => x.saison_id === saisonId) ?? null;

   const groupeIds = (groupeByPersonne[personneId] ?? []).map((id: any) => Number(id));

const groupesActifs: LienGroupe_VM[] = groupeIds
  .map((groupeId: number) => {
    const groupe = groupesById[groupeId];

    if (!groupe) {    
      return null;
    }

    return {
      ...this.mapper.toLienGroupeVm(groupe),
      id: groupeId,
      groupe_id: groupeId,
    } as LienGroupe_VM;
  })
  .filter((groupe): groupe is LienGroupe_VM => !!groupe);
  const contactsByPersonneId: Record<number, ContactDto[]> = {};

for (const cont of contactslist ?? []) {
  (contactsByPersonneId[cont.object_id] ??= []).push(cont);
}

    list.push(
      this.mapper.toAdherentListItemVm({
        rawPersonne,
        activeSaisonId: saisonId,
        inscriptionSaisonActive,
        nbInscriptionsSeance: 1,
        contacts: contactsByPersonneId[personneId] ?? [],
        photo: photosByPersonne[personneId] ?? null,
        groupesActifs,
      })
    );
  }

  return this.mapper.buildPageData(refs, list, activeSaison);
}

  async loadAdherentDetail(id: number, saisonId: number): Promise<AdherentDetail_VM> {
    const [personne, inscriptionsSaison, inscriptionsSeance, groupesParSaison, liste_groupes, contacts, photosByPersonne] = await Promise.all([
      this.personneapi.get(id),
      this.loadInscriptionsSaisonForPersonne(id),
      this.loadInscriptionsSeanceForPersonne(id, saisonId),
      this.liengroupeapi.lienGroupeByPersonne(id, saisonId),
      this.refDataRepository.getGroupes(saisonId),
      this.contactservice.list_by_id([id]),
      this.documentapi.photo_by_id([id]),
    ]);


     const detail = this.mapper.toAdherentDetailVm(
    personne,
    inscriptionsSaison,
    inscriptionsSeance,
    groupesParSaison,
    contacts ?? [],
    saisonId,
    liste_groupes,
  );
  detail.photo = photosByPersonne?.[id] ?? null;

  return detail;
  }

  async createAdherent(vm: AdherentDetail_VM): Promise<AdherentDetail_VM> {
    const dto = {
      date_naissance: this.toIsoDate(vm.date_naissance),
      last_name: vm.nom ?? '',
      first_name: vm.prenom ?? '',
      nickname: vm.surnom ?? null,
      gender: !!vm.sexe,
      address: JSON.stringify(vm.adresse) ?? JSON.stringify(new Adresse()),
      archive: !!vm.archive,
      photo: vm.photo ?? null,
    };
    const saved = await this.personneapi.create(dto);

await this.syncContacts(saved.id, vm.contact ?? [], 'liste_contact');
await this.syncContacts(saved.id, vm.contact_prevenir ?? [], 'liste_contact_prevenir');

await this.documentapi.setPhoto(saved.id, vm.photo ?? null, 'member');

return this.loadAdherentDetail(saved.id, vm.inscriptionsSaison?.find(x => x.active)?.saison_id ?? 0);;
    
  }

  async updateAdherent(vm: AdherentDetail_VM, saisonId: number): Promise<AdherentDetail_VM> {
    const dto = {
      date_naissance: this.toIsoDate(vm.date_naissance),
      last_name: vm.nom ?? '',
      first_name: vm.prenom ?? '',
      nickname: vm.surnom ?? null,
      gender: !!vm.sexe,
      address: JSON.stringify(vm.adresse) ?? '',
      archive: !!vm.archive,photo: vm.photo ?? null,
    };

await this.personneapi.update(vm.id, dto);

await this.syncContacts(vm.id, vm.contact ?? [], 'liste_contact');
await this.syncContacts(vm.id, vm.contact_prevenir ?? [], 'liste_contact_prevenir');

await this.documentapi.setPhoto(vm.id, vm.photo ?? null, 'member');
    return this.loadAdherentDetail(vm.id, saisonId);
  }

  private async syncContacts(
  personneId: number,
  contacts: ItemContact[],
  contactList: 'liste_contact' | 'liste_contact_prevenir',
): Promise<void> {
  const existing = (await this.contactservice.list_by_id([personneId]))
    .filter(c => c.contact_list === contactList);

  const nextContacts = (contacts ?? [])
    .filter(c => !!c.Value?.trim())
    .map(c => ({
      ...c,
      Value: c.Value.trim(),
      Diffusion: c.Type === 'EMAIL' ? !!c.Diffusion : false,
    }));

  const nextIds = new Set(
    nextContacts
      .filter(c => (c.id ?? 0) > 0)
      .map(c => c.id),
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

  async deleteAdherent(id: number): Promise<void> {
    await this.personneapi.remove(id);
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
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
    ).toISOString().slice(0, 10);
  }
}